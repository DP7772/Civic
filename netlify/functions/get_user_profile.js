const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  try {
    const userEmail = event.queryStringParameters?.userEmail;

    if (!userEmail) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Email missing" }) };
    }

    // 1. Fetch "My Posts" (Jo user ne upload kiye) - NO CHANGE
    const uploadsQuery = `
      SELECT * FROM posts 
      WHERE user_email = $1 
      ORDER BY created_at DESC
    `;
    const uploadsResult = await pool.query(uploadsQuery, [userEmail]);

    // 2. Fetch "My Resolved" (LOGIC UPDATED: First Solver Only)
    // Hum check kar rahe hain ki user ka contribution time == post ka sabse pehla contribution time
    
    const solvedQuery = `
      SELECT p.*, c.created_at as contri_date
      FROM posts p
      JOIN contributions c ON p.id = c.post_id
      WHERE 
        p.status = 'resolved'           -- Post resolved honi chahiye
        AND c.solver_email = $1         -- User ne contribute kiya hona chahiye
        AND c.created_at = (            -- CHECK: Kya ye sabse pehla contribution tha?
            SELECT MIN(sub_c.created_at)
            FROM contributions sub_c
            WHERE sub_c.post_id = p.id
        )
      ORDER BY p.created_at DESC
    `;
    
    const solvedResult = await pool.query(solvedQuery, [userEmail]);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        myPosts: uploadsResult.rows, 
        myResolved: solvedResult.rows 
      }),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
