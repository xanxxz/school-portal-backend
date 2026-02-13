import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// ===== Новости =====
app.get('/api/news', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM news ORDER BY date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка получения новостей' });
  }
});

// ===== Преподаватели =====
app.get('/api/teachers', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM teacher`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка получения преподавателей' });
  }
});

// ===== Расписание =====
app.get('/api/schedule', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.id as class_id,
        c.name,
        c.cabinet,
        c.weekday,
        l.number,
        l.subject
      FROM class c
      LEFT JOIN lesson l ON l.class_id = c.id
      ORDER BY c.weekday, c.name, l.number
    `);

    const schedule: Record<string, any> = {};

    rows.forEach(row => {
      if (!schedule[row.weekday]) {
        schedule[row.weekday] = [];
      }

      let existingClass = schedule[row.weekday].find(
        (cls: any) => cls.id === row.class_id
      );

      if (!existingClass) {
        existingClass = {
          id: row.class_id,
          name: row.name,
          cabinet: row.cabinet,
          lessons: []
        };
        schedule[row.weekday].push(existingClass);
      }

      if (row.number) {
        existingClass.lessons.push({
          number: row.number,
          subject: row.subject
        });
      }
    });

    const result = Object.entries(schedule).map(([weekday, classes]) => ({
      weekday,
      classes
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка получения расписания' });
  }
});

// ===== Обратная связь =====
app.post('/api/feedback', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await pool.query(
      `INSERT INTO feedback (name, email, message)
       VALUES ($1, $2, $3)`,
      [name, email, message]
    );

    res.status(200).json({ message: 'Спасибо за сообщение!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка отправки' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
