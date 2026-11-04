import { describe, expect, it } from 'vitest'
import { MAX_BYTES, MAX_PER_FOLDER, checkFile, sizeLabel } from './docs'

describe('checkFile', () => {
  it('PDF·사진은 받는다', () => {
    expect(checkFile({ name: '등본.PDF', size: 1000 }, 0)).toBeNull()
    expect(checkFile({ name: '계약서.jpg', size: 1000 }, 3)).toBeNull()
  })
  it('실행 파일 같은 형식은 막는다', () => {
    expect(checkFile({ name: 'a.exe', size: 10 }, 0)).toMatch(/형식/)
    expect(checkFile({ name: '이름없음', size: 10 }, 0)).toMatch(/형식/)
  })
  it('크기·개수 한도를 지킨다', () => {
    expect(checkFile({ name: 'a.pdf', size: MAX_BYTES + 1 }, 0)).toMatch(/10MB/)
    expect(checkFile({ name: 'a.pdf', size: 0 }, 0)).toMatch(/빈 파일/)
    expect(checkFile({ name: 'a.pdf', size: 1 }, MAX_PER_FOLDER)).toMatch(/개까지/)
  })
  it('크기 표시', () => {
    expect(sizeLabel(500)).toBe('1KB')
    expect(sizeLabel(2.5 * 1024 * 1024)).toBe('2.5MB')
  })
})
