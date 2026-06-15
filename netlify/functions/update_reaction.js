const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { postId, action, priority, userEmail } = JSON.parse(event.body);

    if (!userEmail) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Login required" }) };
    }

    // Logic: Critical = 3, Normal = 1
    let points = priority === 'critical' ? 3 : 1;

    if (action === 'add') {
      // 1. Check if already reacted (Double Security)
      const checkQuery = `SELECT * FROM post_reactions WHERE post_id = $1 AND user_email = $2`;
      const checkRes = await pool.query(checkQuery, [postId, userEmail]);

      if (checkRes.rows.length > 0) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Already reacted" }) };
      }

      // 2. Insert into Ledger
      await pool.query(`INSERT INTO post_reactions (post_id, user_email) VALUES ($1, $2)`, [postId, userEmail]);

      // 3. Increase Count
      const updateQuery = `UPDATE posts SET reactions = reactions + $1 WHERE id = $2 RETURNING reactions`;
      const result = await pool.query(updateQuery, [points, postId]);
      
      return { statusCode: 200, body: JSON.stringify({ success: true, newCount: result.rows[0].reactions }) };

    } else if (action === 'remove') {
      // 1. Delete from Ledger
      await pool.query(`DELETE FROM post_reactions WHERE post_id = $1 AND user_email = $2`, [postId, userEmail]);

      // 2. Decrease Count
      const updateQuery = `UPDATE posts SET reactions = reactions - $1 WHERE id = $2 RETURNING reactions`;
      const result = await pool.query(updateQuery, [points, postId]);

      return { statusCode: 200, body: JSON.stringify({ success: true, newCount: result.rows[0].reactions }) };
    }

  } catch (error) {
    console.error("Reaction Error:", error);
    // Unique constraint violation handle (agar race condition ho)
    if (error.code === '23505') { 
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Already Reacted" }) };
    }
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
