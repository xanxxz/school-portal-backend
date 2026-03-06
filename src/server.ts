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

// ===== АВТОРИЗАЦИЯ =====
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ message: 'login и password обязательны' });

  try {
    const { rows } = await pool.query('SELECT * FROM admin WHERE login = $1 AND password = $2', [login, password]);
    const admin = rows[0];

    if (!admin) return res.status(401).json({ message: 'Неверный логин или пароль' });

    res.json({ token: admin.login });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

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

// ===== ДОБАВЛЕНИЕ НОВОСТИ =====
app.post('/api/news', async (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'admin') return res.status(401).json({ message: 'Нет доступа' });

  const { title, description, category, imageUrl } = req.body;
  if (!title || !description || !category) return res.status(400).json({ message: 'Все поля обязательны' });

  try {
    await pool.query(
      `INSERT INTO news (title, description, category, "imageUrl", date)
       VALUES ($1, $2, $3::text[], $4, NOW())`,
      [title, description, category, imageUrl || null]
    );

    res.status(200).json({ message: 'Новость добавлена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'admin') return res.status(401).json({ message: 'Нет доступа' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'ID новости обязателен' });

  try {
    await pool.query(`DELETE FROM news WHERE id = $1`, [id]);
    res.status(200).json({ message: 'Новость удалена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
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

app.post('/api/teachers', async (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'admin') return res.status(401).json({ message: 'Нет доступа' });

  const { name, position, bio, photoUrl, subjects } = req.body;
  if (!name || !position) return res.status(400).json({ message: 'Имя и должность обязательны' });

  try {
    await pool.query(
      `INSERT INTO teacher (name, position, bio, "photoUrl", subjects)
       VALUES ($1, $2, $3, $4, $5::text[])`,
      [name, position, bio || null, photoUrl || null, subjects || []]
    );

    res.status(200).json({ message: 'Преподаватель добавлен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/teachers/:id', async (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'admin') return res.status(401).json({ message: 'Нет доступа' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'ID преподавателя обязателен' });

  try {
    await pool.query(`DELETE FROM teacher WHERE id = $1`, [id]);
    res.status(200).json({ message: 'Преподаватель удален' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
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
