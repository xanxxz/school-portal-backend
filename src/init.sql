CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT[],
  "imageUrl" TEXT,
  date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teacher (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  bio TEXT,
  "photoUrl" TEXT,
  subjects TEXT[]
);

CREATE TABLE class (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cabinet TEXT NOT NULL,
  weekday TEXT NOT NULL
);

CREATE TABLE lesson (
  id SERIAL PRIMARY KEY,
  number INT NOT NULL,
  subject TEXT NOT NULL,
  class_id INT REFERENCES class(id) ON DELETE CASCADE
);

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
