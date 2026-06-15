const { Pool } = require('pg');

exports.handler = async (event, context) => {
  // Method Check
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let pool;
  try {
    const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
    if (!dbUrl) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: "DB Connection String Missing" }) };
    }

    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    const body = JSON.parse(event.body);
    const { action, page, searchId, newEmail, updateEmail, newCredits, newImpact } = body;

    // --- 1. FETCH DATA (SAME AS BEFORE) ---
    if (action === 'fetch_students') {
      const limit = 10;
      const offset = (page - 1) * limit;
      let query, params;

      if (searchId) {
        query = `SELECT id, email, full_name, user_id, civic_credits, impact_score FROM register_mail WHERE user_id ILIKE $1 OR email ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
        params = [`%${searchId}%`, limit, offset];
      } else {
        query = `SELECT id, email, full_name, user_id, civic_credits, impact_score FROM register_mail ORDER BY id DESC LIMIT $1 OFFSET $2`;
        params = [limit, offset];
      }

      const result = await pool.query(query, params);
      await pool.end();
      return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows }) };
    }

    // --- 2. ADD STUDENT (UPDATED: RANDOM ID LOGIC) ---
    if (action === 'add_student') {
      // Step A: Check if Email exists
      const check = await pool.query("SELECT id FROM register_mail WHERE email = $1", [newEmail]);
      if (check.rows.length > 0) {
        await pool.end();
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Email Exists" }) };
      }

      // Step B: Generate Random User ID (CIVIC-XXXX)
      const randomId = "CIVIC-" + Math.floor(1000 + Math.random() * 9000);

      // Step C: Insert with Random ID (Not 'NEW')
      await pool.query(
        `INSERT INTO register_mail (email, full_name, user_id, password, civic_credits, impact_score) 
         VALUES ($1, 'Pending User', $2, 'temp123', 0, 0)`, 
         [newEmail, randomId]
      );
      
      await pool.end();
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // --- 3. UPDATE STATS (SAME AS BEFORE) ---
    if (action === 'update_stats') {
        if (!updateEmail) {
            await pool.end();
            return { statusCode: 400, body: JSON.stringify({ success: false, message: "Email Missing for Update" }) };
        }

        // Database Update Query
        await pool.query(
            `UPDATE register_mail SET civic_credits = $1, impact_score = $2 WHERE email = $3`,
            [newCredits, newImpact, updateEmail]
        );
        
        await pool.end();
        return { statusCode: 200, body: JSON.stringify({ success: true, message: "Updated Successfully" }) };
    }

    await pool.end();
    return { statusCode: 400, body: "Invalid Action" };

  } catch (error) {
    console.error("Server Error:", error);
    if(pool) await pool.end();
    
    // Handle specific Unique Constraint Error
    if (error.code === '23505') {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Duplicate ID generated. Please try again." }) };
    }

    return { statusCode: 500, body: JSON.stringify({ success: false, message: error.message }) };
  }
};
