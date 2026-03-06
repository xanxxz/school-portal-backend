import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
app.use(cors());
app.use(express.json());
// ===== JWT Middleware =====
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ message: 'Требуется токен' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: 'Неверный или просроченный токен' });
    }
};
// ===== АВТОРИЗАЦИЯ =====
app.post('/api/auth/login', async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password)
        return res.status(400).json({ message: 'login и password обязательны' });
    try {
        const { rows } = await pool.query('SELECT * FROM admin WHERE login = $1', [login]);
        const admin = rows[0];
        if (!admin)
            return res.status(401).json({ message: 'Неверный логин или пароль' });
        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid)
            return res.status(401).json({ message: 'Неверный логин или пароль' });
        const token = jwt.sign({ id: admin.id, login: admin.login }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});
app.get('/api/admin/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});
// ===== Новости =====
app.get('/api/news', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM news ORDER BY date DESC`);
        res.json(rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка получения новостей' });
    }
});
// ===== Преподаватели =====
app.get('/api/teachers', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM teacher`);
        res.json(rows);
    }
    catch (err) {
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
        const schedule = {};
        rows.forEach(row => {
            if (!schedule[row.weekday]) {
                schedule[row.weekday] = [];
            }
            let existingClass = schedule[row.weekday].find((cls) => cls.id === row.class_id);
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка получения расписания' });
    }
});
// ===== Обратная связь =====
app.post('/api/feedback', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await pool.query(`INSERT INTO feedback (name, email, message)
       VALUES ($1, $2, $3)`, [name, email, message]);
        res.status(200).json({ message: 'Спасибо за сообщение!' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка отправки' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
