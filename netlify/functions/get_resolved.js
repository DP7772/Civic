const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  try {
    // Sirf 'resolved' wale posts uthao
    const query = `
      SELECT * FROM posts 
      WHERE status = 'resolved' 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, posts: result.rows }),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
