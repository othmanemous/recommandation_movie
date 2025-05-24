const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const dotenv =require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "movies"
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

app.post('/api/signup', (req, res) => {
  const sql = "INSERT INTO users (`username`, `email`, `password`) VALUES (?)";
  const values = [req.body.username, req.body.email, req.body.password];
  db.query(sql, [values], (err, data) => {
    if (err) return res.json("Error");
    return res.json(data);
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.query(query, [username, password], (err, result) => {
    if (err) return res.status(500).send({ error: 'Database error' });
    if (result.length > 0) {
      const userId = result[0].userId;
      return res.status(200).send({ userId, message: 'Login successful' });
    } else {
      return res.status(401).send({ error: 'Invalid credentials' });
    }
  });
});

app.post('/api/page/movies', (req, res) => {
  const { userId, movieId, title, overview, poster_path } = req.body;

  if (!userId || !movieId) {
    return res.status(400).json({ message: 'userId et movieId sont requis.' });
  }

  const sql = `INSERT INTO favorites (userId, movieId, title, overview, poster_path) VALUES (?, ?, ?, ?, ?)`;
  const values = [userId, movieId, title, overview, poster_path];

  db.query(sql, values, (error, result) => {
    if (error) {
      console.error('Erreur MySQL:', error);
      return res.status(500).json({ message: 'Erreur serveur lors de l’ajout aux favoris.' });
    }
    return res.status(201).json({ message: 'Film ajouté aux favoris.', insertId: result.insertId });
  });
});

app.get('/api/page/favorites/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = 'SELECT * FROM favorites WHERE userId = ?';
  db.query(sql, [userId], (error, results) => {
    if (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      return res.status(500).json({ error: 'Erreur serveur lors de la récupération des favoris' });
    }
    res.status(200).json(results);
  });
});

app.delete('/api/page/favorites/:favoriteId', (req, res) => {
  const favoriteId = req.params.favoriteId;
  const sql = 'DELETE FROM favorites WHERE id = ?';
  db.query(sql, [favoriteId], (error) => {
    if (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      return res.status(500).json({ error: 'Erreur serveur lors de la suppression du favori' });
    }
    res.status(200).json({ success: true, message: 'Favori supprimé avec succès' });
  });
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Rechercher un film par titre
app.post("/api/page/search", async (req, res) => {
  const { query } = req.body;

  try {
    // 1. Cherche l'ID du film
    const searchRes = await fetch(`${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`);
    const searchData = await searchRes.json();
    const movie = searchData.results[0];
    if (!movie) return res.status(404).json({ message: "Film non trouvé" });

    // 2. Récupère des films similaires
    const similarRes = await fetch(`${TMDB_BASE_URL}/movie/${movie.id}/similar?api_key=${TMDB_API_KEY}`);
    const similarData = await similarRes.json();

    res.json({
      original: movie,
      recommendations: similarData.results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});


app.listen(8081, () => {
  console.log("Server listening on port 8081");
});
