const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  try {
    // 1. User Email nikalo
    const userEmail = event.queryStringParameters?.userEmail || "";

    // 2. Updated SQL Query (Reaction Logic Added)
    // - has_contributed: Check karega ki contribution kiya hai ya nahi.
    // - has_reacted: Check karega ki vote diya hai ya nahi.
    
    const query = `
      SELECT p.*, 
      (SELECT count(*) FROM contributions c WHERE c.post_id = p.id AND c.solver_email = $1) > 0 as has_contributed,
      (SELECT count(*) FROM post_reactions r WHERE r.post_id = p.id AND r.user_email = $1) > 0 as has_reacted
      FROM posts p
      WHERE p.status = 'active' 
      ORDER BY p.reactions DESC, p.created_at DESC
    `;
    
    // 3. Query Run (userEmail $1 ki jagah jayega dono sub-queries mein)
    const result = await pool.query(query, [userEmail]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, posts: result.rows }),
    };

  } catch (error) {
    console.error("Get Posts Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ success: false, error: error.message }) 
    };
  }
};
