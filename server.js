const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 관리자 비밀번호: Railway 환경변수 ADMIN_PASSWORD로 설정. 미설정 시 기본값(반드시 변경 권장)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';

// Railway가 주입하는 DATABASE_URL 사용
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

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
      `SELECT id, name, phone, email, floor, biz, message, created_at
       FROM inquiries ORDER BY created_at DESC`
    );
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '조회 중 오류가 발생했습니다.' });
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
