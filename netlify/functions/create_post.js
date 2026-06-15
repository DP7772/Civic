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
    const data = JSON.parse(event.body);
    
    // Data Destructuring
    const { 
      userEmail, title, description, imageUrl, priority, aadhar,
      country, city, region, postalCode, battery
    } = data;

    // Validation
    if (!userEmail || !title || !description || !imageUrl) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing Fields" }) };
    }

    // --- LOGIC: SET INITIAL REACTION COUNT ---
    const initialReactions = (priority === 'critical') ? 3 : 1;

    // 1. SQL Query to Insert Data (Same as before)
    const insertQuery = `
      INSERT INTO posts 
      (user_email, title, description, image_url, priority, aadhar_number, country, city, region, postal_code, battery_level, reactions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at;
    `;

    const values = [
      userEmail, title, description, imageUrl, priority, 
      aadhar || null, country, city, region, postalCode, battery,
      initialReactions
    ];

    const result = await pool.query(insertQuery, values);

    // ==============================================================
    // NEW ADD-ON: REWARD USER (+50 Civic Credits)
    // ==============================================================
    const rewardQuery = `
      UPDATE register_mail 
      SET civic_credits = civic_credits + 50 
      WHERE email = $1
    `;
    await pool.query(rewardQuery, [userEmail]); // Post owner ko points do

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: "Post Created & 50 Credits Added!", 
        postId: result.rows[0].id,
        timestamp: result.rows[0].created_at
      }),
    };

  } catch (error) {
    console.error("Post Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Database Error" }),
    };
  }
};
