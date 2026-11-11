// 반응형 자동 점검: 빌드 결과를 띄워 모든 화면 폭 × 모든 경로에서 가로 넘침을 찾는다.
// 사용: npm run check:responsive   (macOS의 Google Chrome 사용, 별도 브라우저 다운로드 없음)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { viewports, routes } = JSON.parse(readFileSync(new URL('./viewports.json', import.meta.url)))
const PORT = 4199
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
const stop = () => server.kill()
process.on('exit', stop)

for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 200))
}

const browser = await chromium.launch({ channel: 'chrome' })
let bad = 0
for (const v of viewports) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.width < 800, hasTouch: v.width < 800 })
  for (const route of routes) {
    const page = await ctx.newPage()
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const issues = await page.evaluate(() => {
      const W = document.documentElement.clientWidth
      const out = []
      const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      if (sw > W + 1) out.push(`페이지 가로 스크롤 발생 (scrollWidth ${sw} > ${W})`)
      // 스크롤/잘림 컨테이너 안에 있는 요소는 정상(캐러셀·영상 등)으로 본다.
      const clipped = (el) => {
        for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
          const o = getComputedStyle(p)
          if (o.overflowX !== 'visible' && p.getBoundingClientRect().right <= W + 1) return true
        }
        return false
      }
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (r.width === 0 || cs.position === 'fixed' || cs.visibility === 'hidden') continue
        if ((r.right > W + 1 || r.left < -1) && !clipped(el)) {
          out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} 이(가) 화면 밖으로 나감 (left ${Math.round(r.left)}, right ${Math.round(r.right)})`)
          if (out.length > 5) break
        }
      }
      return out
    })
    if (issues.length) { bad++; console.log(`✗ ${v.name} ${route}\n   ${issues.join('\n   ')}`) }
    else console.log(`✓ ${v.name} ${route}`)
    await page.close()
  }
  await ctx.close()
}
await browser.close()
stop()
console.log(bad ? `\n${bad}건 문제 발견` : '\n모든 화면 폭에서 이상 없음')
process.exit(bad ? 1 : 0)
