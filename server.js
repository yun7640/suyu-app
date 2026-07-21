const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 관리자 비밀번호: Railway 환경변수 ADMIN_PASSWORD로 설정. 미설정 시 기본값(반드시 변경 권장)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';

// DB 연결 설정
// 1순위: DATABASE_URL (Railway 참조 변수)
// 2순위: 개별 PG 변수 (Railway가 Postgres 서비스에 자동 주입: PGHOST, PGPORT, ...)
// 진단 로그: 어떤 방식이 감지됐는지 시작 시 출력
const hasUrl = !!process.env.DATABASE_URL;
const hasPgVars = !!(process.env.PGHOST || process.env.POSTGRES_HOST);

console.log('[DB config] DATABASE_URL present:', hasUrl, '| PGHOST present:', !!process.env.PGHOST);

let poolConfig;
if (hasUrl) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  };
} else if (hasPgVars) {
  poolConfig = {
    host: process.env.PGHOST || process.env.POSTGRES_HOST,
    port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.PGUSER || process.env.POSTGRES_USER,
    password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.PGDATABASE || process.env.POSTGRES_DB,
    ssl: { rejectUnauthorized: false },
  };
} else {
  console.error('[DB config] 경고: DATABASE_URL도 PG* 변수도 없습니다. DB 연결이 실패합니다.');
  poolConfig = {}; // 연결 시 에러 발생 → 로그로 확인 가능
}

const pool = new Pool(poolConfig);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// DB 테이블 초기화
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      floor TEXT,
      biz TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // 답글/처리 메모 컬럼 (기존 테이블에도 안전하게 추가)
  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS memo TEXT;`);
  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '신규';`);
  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS memo_updated_at TIMESTAMPTZ;`);
  console.log('DB ready');
}

// 문의 등록 (공개) — 저장만, 목록 노출 없음
app.post('/api/inquiries', async (req, res) => {
  try {
    const { name, phone, email, floor, biz, message } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ ok: false, error: '필수 항목이 비어 있습니다.' });
    }
    await pool.query(
      `INSERT INTO inquiries (name, phone, email, floor, biz, message)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [name, phone, email || null, floor || null, biz || null, message]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '저장 중 오류가 발생했습니다.' });
  }
});

// 관리자 조회 (비밀번호 필요) — 임대인만 열람
app.post('/api/admin/inquiries', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: '비밀번호가 올바르지 않습니다.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, name, phone, email, floor, biz, message, created_at, memo, status, memo_updated_at
       FROM inquiries ORDER BY created_at DESC`
    );
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '조회 중 오류가 발생했습니다.' });
  }
});

// 관리자 메모/상태 저장 (비밀번호 필요)
app.post('/api/admin/memo', async (req, res) => {
  const { password, id, memo, status } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: '비밀번호가 올바르지 않습니다.' });
  }
  if (!id) {
    return res.status(400).json({ ok: false, error: '문의 ID가 필요합니다.' });
  }
  try {
    await pool.query(
      `UPDATE inquiries
       SET memo = $1, status = $2, memo_updated_at = NOW()
       WHERE id = $3`,
      [memo || null, status || '신규', id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '메모 저장 중 오류가 발생했습니다.' });
  }
});

// 관리자 페이지
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  try { await initDb(); } catch (e) { console.error('DB init failed', e); }
  console.log(`Server on ${PORT}`);
});
