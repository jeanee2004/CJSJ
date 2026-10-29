# 공공 API 연동 기록

확인일: **2026-10-28**. 모든 "확인" 항목은 이날 `.env.local` 의 키로 실제 호출해 응답을 받은 것이다.
"추정"은 문서·관례로 짐작했지만 직접 확인하지 못한 것이다.

## 구조

- 프론트는 `/api/*` 만 호출한다. 키는 Vercel 서버리스 함수(`api/*.ts`)에서 `process.env` 로만 읽는다. `VITE_` 접두사는 쓰지 않는다.
- 공통 유틸: `api/_lib/http.ts`(응답·키 마스킹·캐시 헤더), `api/_lib/upstream.ts`(호출·게이트웨이 오류 분류), `api/_lib/xml.ts`(평평한 XML 파서).
- 키가 없으면 `500 {"error":"SERVER_CONFIG","message":"서버 설정 오류"}`. 키 이름·값은 응답에 넣지 않는다.
- 업스트림 실패는 `502/504 {"error":"<코드>","message":"…"}` 이고, 60초만 CDN 캐시한다.
- `vercel.json` 의 SPA 리라이트는 `/api/` 를 빼도록 바꿨다.

### 오류 코드 (공공데이터포털 게이트웨이 `returnReasonCode`)

| 코드 | 의미 | 응답 error |
|---|---|---|
| 30 | SERVICE_KEY_IS_NOT_REGISTERED_ERROR (활용신청 안 됨 / 키 활성화 대기, 최대 1시간) | `KEY_NOT_REGISTERED` |
| 22 | 일일 호출 한도 초과 | `QUOTA_EXCEEDED` |
| 05 | SERVICETIMEOUT_ERROR (제공기관 서버 응답 없음) — 한 번 재시도 | `UPSTREAM_TIMEOUT` |
| 31 | 키 기한 만료 | `KEY_EXPIRED` |
| 20, 32 | 접근 거부 / 미등록 IP | `ACCESS_DENIED` |

30·05 는 실제로 관측했다(아래). 22·31·20·32 는 포털 공통 코드표 기준 **추정**이며 직접 재현하지 않았다.

---

## 1. 국토부 실거래가 → `GET /api/trades`

| type | 확인된 엔드포인트 | 결과 |
|---|---|---|
| apt-rent | `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent` | ✅ 확인 |
| apt-trade | `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev` | ✅ 확인 |
| (참고) | `RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade` (Dev 아님) | ❌ 403 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` — 이 키로 활용신청되지 않은 서비스. 활성화 대기 아님. 쓰지 않음 |
| rh-rent | `…/RTMSDataSvcRHRent/getRTMSDataSvcRHRent` | ✅ 확인 |
| sh-rent | `…/RTMSDataSvcSHRent/getRTMSDataSvcSHRent` | ✅ 확인 |
| offi-rent | `…/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent` | ✅ 확인 |

- 요청 파라미터: `serviceKey`, `LAWD_CD`(5자리, 세종 36110), `DEAL_YMD`(YYYYMM), `numOfRows`(1000 사용), `pageNo`.
- 응답: XML. 성공 `resultCode=000`. `totalCount` 로 페이지를 끝까지 돈다.
- 확인된 응답 필드
  - 공통: `dealYear`, `dealMonth`, `dealDay`, `buildYear`, `umdNm`, `sggCd`
  - 전월세: `deposit`(만원, 콤마), `monthlyRent`, `contractTerm`, `contractType`(신규/갱신), `preDeposit`, `preMonthlyRent`, `excluUseAr`, `floor`, `jibun`
  - 아파트: `aptNm`, `aptSeq` / 연립다세대: `mhouseNm`, `houseType` / 오피스텔: `offiNm` / 단독다가구: `houseType`, `totalFloorAr`(전용면적·지번 없음)
  - 매매(Dev): `dealAmount`, `aptDong`, `bonbun`, `bubun`, `buyerGbn`, `dealingGbn`, `cdealType`(해제 시 `O`), `cdealDay`
- 정규화: `kind`(매매/전세/월세, **월세 0이면 전세**), `deposit`, `monthlyRent`, `area`, `buildYear`, `dong`, `jibun`, `name`, `floor`, `contractDate`, `contractType`, `cancelled`.
- `summary=1` 이면 건수만(`total, sale, saleCancelled, jeonse, monthly`) 돌려준다. `sale` 은 해제를 뺀 건수.
- 캐시: 최근 3개월은 `s-maxage=86400`(신고 기한 30일·해제 신고 반영), 그 이전 달은 `s-maxage=2592000`(30일).
- 한도: **미확인**. 포털 개발계정 기본값(일 1,000~10,000건)은 서비스마다 달라 상세 페이지에서 확인 필요.

### 검증: 세종 아파트 매매 vs 전세 (2026-10-28 조회)

| 계약월 | 매매 신고 | 해제 | 매매(해제 제외) | 전세(월세 0) | 월세 | 전월세 합계 |
|---|---|---|---|---|---|---|
| 2026.04 | 424 | 28 | 396 | **640** | 602 | 1,242 |
| 2026.05 | 410 | 23 | **387** | **610** | 524 | 1,134 |
| 2026.06 | 373 | 8 | 365 | **691** | 548 | 1,239 |
| 2026.08 | 326 | 17 | 309 | 637 | 537 | 1,174 |

→ 기존 문서의 **"매매 580 vs 전세 150"은 맞지 않는다.** 2026년 5월은 매매 410건(해제 제외 387건), 전세 610건으로 전세가 약 1.6배 많다.
`src/data/stats.ts` 폴백값을 2026.05 실측값(387 / 610)으로 바꿨다.

2026.05 다른 유형(전월세 합계 / 전세 / 월세): 연립다세대 43 / 2 / 41, 단독다가구 164 / 23 / 141, 오피스텔 90 / 13 / 77.

---

## 2. 건축HUB 건축물대장 → `POST /api/building`

- 확인된 엔드포인트: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo` (표제부) ✅
- 파라미터: `sigunguCd`(5), `bjdongCd`(5), `platGbCd`(0 대지, 1 산), `bun`(4자리), `ji`(4자리), `numOfRows`, `pageNo`, `_type=json`.
- 응답: JSON. 성공 `response.header.resultCode = "00"`. `items.item` 은 1건이면 객체, 여러 건이면 배열, 0건이면 빈 배열.
- 확인된 판정 필드: `mainPurpsCdNm`(주용도), `etcPurps`(기타용도), `regstrKindCdNm`(일반건축물/표제부), `bldNm`, `dongNm`, `platPlc`.
- **판정 규칙**: 한 지번의 건물 중 하나라도 `mainPurpsCdNm` 또는 `etcPurps` 에 "다중주택"이 있으면 `true`, 건물이 있는데 없으면 `false`, 대장이 0건이면 `unknown`. 판정 근거(용도 필드)를 같이 돌려준다.
  - 다중주택은 주용도가 "단독주택"이고 **기타용도에만** "다중주택"으로 적힌 사례를 실제로 확인했다. 그래서 두 필드를 다 봐야 한다.
- 개인정보: 사용자가 고른 주소라서 GET 쿼리(접근 로그에 남음) 대신 **POST 본문**으로 받는다(요청서는 GET이었음). 응답은 `Cache-Control: private, no-store`, 실패 로그에도 지번을 남기지 않는다. 응답에 `platPlc`(주소)도 넣지 않는다.
- 동 전체 조회(`bun` 없이)는 제공기관 서버에서 타임아웃(05)이 자주 난다. 지번을 넣은 조회는 0.2초 안팎으로 응답했다.
- 표제부가 없고 총괄표제부(`getBrRecapTitleInfo`)만 있는 건물은 지금 `unknown` 이 된다. 총괄표제부 보조 조회는 **미구현**.

### 검증: 세종 지번 3곳

| 지번 | 기대 | 결과 | 근거 |
|---|---|---|---|
| 조치원읍 신안리 151 (`25032`, `0151-0000`) | 다중주택 | `true` | 단독주택 / 다중주택 |
| 조치원읍 신안리 140-7 (`25032`, `0140-0007`) | 다가구 | `false` | 단독주택 / 다가구주택, 단독주택 / 단독주택 |
| 조치원읍 원리 2-3 (`25021`, `0002-0003`) | 공동주택 | `false` | 공동주택 / 제1,2종근린생활시설, 아파트 |

다중주택 사례는 조치원읍 리 단위 약 5,000건을 훑어 찾은 1건이다(세종에는 드물다).

### 주소 변환 (프론트, `src/lib/address.ts`)

카카오(Daum) 우편번호 `oncomplete` 의 `bcode`(10자리)와 `jibunAddress`(도로명을 고르면 `autoJibunAddress`)를 쓴다.
`sigunguCd = bcode[0:5]`, `bjdongCd = bcode[5:10]`, 지번 `본번-부번` → 4자리 0패딩, "산"이면 `platGbCd=1`.
우편번호 팝업 자체는 브라우저에서 직접 눌러 보지 못했다(**미확인**). `bcode`·`jibunAddress` 형식은 Daum 우편번호 가이드 기준이다.

---

## 3. 마이홈 공공임대 모집공고 → `GET /api/myhome`

- 확인된 엔드포인트: `https://apis.data.go.kr/1613000/HWSPR02/rsdtRcritNtcList` ✅
- 파라미터: `pageNo`, `numOfRows`, `brtcCode`(시도코드, 세종 `36`). `brtcCode=11`(서울)도 결과가 달라 필터가 동작함을 확인. `signguCode` 등 다른 파라미터는 **미확인**.
- 응답: JSON. 성공 `resultCode="00"`. 확인된 필드: `pblancId, houseSn, sttusNm, pblancNm, suplyInsttNm, houseTyNm, suplyTyNm, beforePblancId, rcritPblancDe, przwnerPresnatnDe, suplyHoCo, refrnc, url, pcUrl, mobileUrl, hsmpNm, brtcNm, signguNm, fullAdres, rnCodeNm, refrnLegaldongNm, pnu, heatMthdNm, totHshldCo, sumSuplyCo, rentGtn, enty, prtpay, surlus, mtRntchrg, beginDe, endDe`.
- "지금 신청 가능" = 한국 시간 오늘이 `beginDe ~ endDe` 안에 있는 공고.
- 2026-10-28 결과: 세종 4건, 모두 접수 중(LH 전세임대 수시모집 — 다자녀, 신혼·신생아 Ⅰ/Ⅱ, 청년 1순위).
- 캐시: `s-maxage=21600`(6시간).

## 4. 혜택 → `GET /api/benefits`

세 출처를 병렬로 부르고, 하나가 실패해도 나머지로 응답한다(`status` 에 출처별 결과). 모두 성공하면 CDN 1일 + 인스턴스 메모리 6시간 캐시, 일부 실패면 5분.

| 출처 | 확인된 엔드포인트·파라미터 | 비고 |
|---|---|---|
| 행안부 공공서비스(정부24) | `https://api.odcloud.kr/api/gov24/v3/serviceList?page&perPage&returnType=JSON&cond[소관기관명::LIKE]=세종특별자치시&cond[서비스분야::LIKE]=주거` ✅ | JSON, 한글 필드(`서비스명, 서비스목적요약, 지원대상, 소관기관명, 부서명, 신청기한, 상세조회URL, 서비스ID` 등). 세종+주거 7건 |
| 복지로 지자체복지 | `https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist?pageNo&numOfRows&ctpvNm=세종특별자치시` ✅ | XML, `<servList>` 반복(`servId, servNm, servDgst, servDtlLink, lifeNmArray, intrsThemaNmArray, bizChrDeptNm, aplyMtdNm` …). 세종 52건. **`searchWrd` 를 넣으면 `resultCode=99 UNKNOWN_ERROR`**. 응답이 20초를 넘기는 경우가 있어 45초 타임아웃 |
| 온통청년 | `https://www.youthcenter.go.kr/go/ythip/getPlcy?apiKeyNm&pageNum&pageSize&rtnType=json&zipCd=36110&lclsfNm=주거` ✅ | JSON, `resultCode=200`. **`pageSize=100` 이면 `e003 api data invalid`**, 50은 정상. 세종 주거 65건 중 세종시 주관 6건 |

- 필터: 청년·신혼·대학생·사회초년생 대상 + 주거 낱말(주거비·임대료·임대주택·임차·월세·전세·보증금·쉐어하우스·주택 등). 변경·중지 신청 창구는 뺀다.
  "주거지가 아닌" 같은 표현이 걸리지 않도록 "주거" 단독은 쓰지 않는다.
- 이름을 정규화해 같은 제도를 합친다(정부24 → 온통청년 → 복지로 순서로 남김).
- 2026-10-28 결과: 8건.
- 한도: 정부24·복지로 모두 **미확인**(포털 상세 페이지 확인 필요).

### 진단 결과 반영 (`src/lib/live.ts`, 2026-10-29)

모두 브라우저에서 계산한다. 설문 답은 서버로 보내지 않는다.

- **접수 일정**: `/api/benefits` 항목을 이름으로 진단 카드와 맞춘다(`policyOf`). 날짜는 **온통청년 `aplyYmd` 를 먼저** 쓰고, 없으면 정부24 `신청기한` 문구("상시신청", "금년 접수 마감")를 쓴다. API는 같은 제도를 합칠 때 온통청년 항목을 남기고 빈 칸(정부24 신청기한 등)만 채운다.
  - 자격 판정(`evaluate`)은 그대로 두고 일정 문장만 맨 앞에 붙인다. 마감이면 "신청할 수 있어요" → "확인해 보면 좋아요". 자격이 안 되는 카드는 건드리지 않는다.
  - 최신 일정이 있으면 하드코딩된 날짜 문장(세종 임대료 "사흘·3월 3~5일")과 홈 카드 "신청 방법" 끝의 날짜 괄호를 숨긴다. 못 불러오면 기존 문구 + "최신 데이터를 불러오지 못했습니다".
  - 매칭되는 제도: 세종 이자지원, 세종 주거임대료, 국토부 청년월세. 버팀목 2종은 온통청년 세종 목록에 없어 기존 문구 그대로.
  - 2026-10-29 기준 결과: 세종 이자지원 3.1~3.31, 세종 주거임대료 6.1~6.30, 국토부 청년월세 3.2~5.30 — 셋 다 마감. (기존 `policies.ts` 문구 "3.3~3.5", "3.30부터 상시"와 다름 → 온통청년 우선)
- **다중주택**: 주소 확인을 N3(구하려는 집 종류)로 옮겼다. `true/false` 가 나오면 N3 답을 `multi/normal` 로 채워 판정에 바로 반영된다. `unknown` 이면 답을 바꾸지 않는다.
- **공공임대 공고**: 공고 이름으로 대상을 가늠해(다자녀=자녀 있음, 신혼·신생아=부부 또는 자녀, 청년=19~39세 미혼) 맞지 않는 공고는 접고 "모두 보기"로 펼친다. 마이홈 응답에 자격 필드가 없어 이름 기준이다.
- **추가 혜택**: 진단 카드에 있는 제도(위 세 가지)는 목록에서 뺀다. 쉐어하우스처럼 출처마다 이름이 다른 같은 제도는 아직 두 줄로 나온다.

## 5. R-ONE (한국부동산원) → `GET /api/rone`

키 `RONE_KEY`(R-ONE 자체 발급, 공공데이터포털 키와 별개). 응답은 항상 HTTP 200이고 성공/오류는 본문 `RESULT.CODE` 로 구분한다.

- 통계표 목록: `https://www.reb.or.kr/r-one/openapi/SttsApiTbl.do?KEY&Type=json&pIndex&pSize` ✅ (738개). `STATBL_ID` 로 `STATBL_NM`·`DTACYCLE_CD`(MM 월)·`RPSTUI_NM`(기준시점) 확인.
- 분류 목록: `SttsApiTblItm.do?KEY&Type=json&STATBL_ID=…` ✅ — 세종은 `ITM_ID=500014`(`CLS_ID` 로 쓰임).
- 자료: `SttsApiTblData.do?KEY&Type=json&STATBL_ID&DTACYCLE_CD=MM&CLS_ID=500014&START_WRTTIME=YYYYMM&END_WRTTIME=YYYYMM&pIndex&pSize` ✅
  - `START_WRTTIME`/`END_WRTTIME` 이 기간 필터다. (`START_WRTTIME_IDTFR_ID` 등 비슷한 이름은 **무시됨**.) `WRTTIME_IDTFR_ID=YYYYMM` 로 한 달만 받을 수도 있다.
  - 응답: `{"SttsApiTblData":[{"head":[{list_total_count},{RESULT:{CODE,MESSAGE}}]},{"row":[…]}]}`. 행 필드: `STATBL_ID, DTACYCLE_CD, WRTTIME_IDTFR_ID(YYYYMM), CLS_ID, CLS_NM, ITM_ID, ITM_NM, DTA_VAL(숫자), UI_NM(단위), CLS_FULLNM, WRTTIME_DESC`.
  - 오류: `ERROR-290` 인증키 무효(= `KEY_NOT_REGISTERED`로 매핑, 잘못된 키로 확인), `INFO-200` 자료 없음(발표 전 달). `ERROR-300`·`ERROR-336/337`(한도)은 R-ONE 안내 기준 **추정**, 재현 안 함.
- 사용한 통계표 (둘 다 아파트, 월간, 세종 `CLS_ID=500014`)

| STATBL_ID | 이름 | 단위 |
|---|---|---|
| `A_2024_00182` | (월) 지역별 전세지수_아파트 | 지수, 기준시점 **2026.06.=100** |
| `A_2024_00192` | (월) 지역별 전세 평균가격_아파트 | 만원/㎡ |

- 통계표 메타의 `DATA_END_YY` 는 2024로 멈춰 있지만 실제 자료는 **2026.08까지** 나온다(메타를 믿지 말 것). 2026-10-29 기준 최신 발표월은 2026.08, 09·10월은 `INFO-200`.
- 확인 결과 (세종 전세지수): 2025.08 92.8 → 2026.06 100.0 → 2026.08 **98.37** (전월 대비 -1.59%, 전년 동월 대비 +6.03%). 평균가격 2026.08 289.6만원/㎡. 중위가격(`A_2024_00193`)도 같은 형태로 응답(2026.08 280.4)하나 쓰지 않는다.
- `/api/rone` 은 두 통계표를 병렬 호출해 `{ source, fetchedAt, region, index, avgPrice }` 를 돌려준다. 각각 `{ unit, latest:{ym,value}, mom(%), yoy(%), series:[최근 12개월] }`. 한쪽만 실패하면 그 칸이 `null`, 둘 다 실패하면 502. 최신 발표월은 호출 때마다 달라지므로 `latest.ym` 을 그대로 표기할 것.
- 캐시: 모두 성공 시 `s-maxage=86400`, 일부 실패 시 600.
- 한도: **미확인**.

## 6. 화면별 데이터 11종 대응표

| 영역 | 경로 |
|---|---|
| 아파트·오피스텔·연립다세대·단독다가구 전월세 | `GET /api/trades?type=apt-rent｜offi-rent｜rh-rent｜sh-rent&dealYmd=YYYYMM` |
| 아파트 매매 상세 | `GET /api/trades?type=apt-trade&dealYmd=YYYYMM` (`summary=1` 없으면 `items`) |
| 건축HUB 건축물대장 | `POST /api/building` |
| 마이홈 모집공고 | `GET /api/myhome` |
| 정부24·복지로·온통청년 | `GET /api/benefits` (`items[].source` 로 구분) |
| R-ONE 세종 전세 동향 | `GET /api/rone` |

2026-10-29 `LIVE=1` 로 위 전부 재호출해 정상 응답 확인(매매 424/410/373, 전세 640/610/691, 건축물대장 3곳 판정, 마이홈 4건, 혜택 8건, R-ONE).

---

## 로컬 실행

- 정식: `vercel dev` (프로젝트 루트의 `.env.local` 을 읽는다). Vercel CLI는 이 기기에 설치되어 있지 않다.
- 실제 호출 검증:
  `LIVE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run api/_lib/live.test.ts --silent=false`
- 단위 테스트: `npm test` (live 테스트는 `LIVE` 가 없으면 건너뛴다).


## 정부24 지원조건 (supportConditions) — 2026-10-29 확인

- `GET https://api.odcloud.kr/api/gov24/v3/supportConditions?page=1&perPage=1&returnType=JSON&cond[서비스ID::EQ]=<서비스ID>` (같은 `DATA_GO_KR_KEY`, `serviceKey` 파라미터)
- 세종 주거 7건 모두 200. `JA0110`/`JA0111` = 나이 하한·상한 (예: 보증료 지원 19~120, 이자지원 null). 나머지 `JAxxxx` 는 `"Y"`/null 플래그이며 **코드 뜻은 미확인**이라 쓰지 않는다.
- `/api/benefits` 가 정부24 항목마다 한 번씩 불러 `ages` 에 넣는다. 실패하면 `ages` 만 빠진다.
- 온통청년 나이: `sprtTrgtAgeLmtYn=N` 이면 `sprtTrgtMinAge`/`sprtTrgtMaxAge` 사용, `Y` 면 0/0 (제한 없음). 소득은 세종 주거 6건 모두 `earnCndSeCd=0043003`(기타)·금액 0 이라 `earnEtcCn` 글로만 있다 → `conditions`.
- 어긋나는 값: 청년월세 지원 온통청년 필드 19~39 vs 본문·정부24·RULES 19~34.
