const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  // Sirf POST request allow karo
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { postId } = JSON.parse(event.body);

    if (!postId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Post ID missing" }) };
    }

    // ==============================================================
    // STEP 1: FIND FIRST SOLVER & UPDATE RESOLVED COUNT
    // ==============================================================
    // Check karo sabse pehle kisne contribute kiya (Time ke hisaab se)
    const findWinnerQuery = `
      SELECT solver_email 
      FROM contributions 
      WHERE post_id = $1 
      ORDER BY created_at ASC 
      LIMIT 1
    `;
    const winnerResult = await pool.query(findWinnerQuery, [postId]);

    // Agar koi contributor mila, toh uska resolved_count +1 karo
    if (winnerResult.rows.length > 0) {
      // 1. Email ko clean karo (Lower case aur Spaces hatao match ke liye)
      const rawEmail = winnerResult.rows[0].solver_email;
      const cleanEmail = rawEmail.trim().toLowerCase();
      
      // 2. resolved_count badhao (+1)
      // COALESCE(resolved_count, 0) ka matlab hai agar count NULL hai toh 0 maano
      const countQuery = `
        UPDATE register_mail 
        SET resolved_count = COALESCE(resolved_count, 0) + 1 
        WHERE LOWER(email) = $1
      `;
      await pool.query(countQuery, [cleanEmail]);
      console.log(`Resolved Count +1 for: ${cleanEmail}`);
    }

    // ==============================================================
    // STEP 2: Latest Contribution (Photo) Nikalo (Same as before)
    // ==============================================================
    const proofQuery = `
      SELECT proof_image_url 
      FROM contributions 
      WHERE post_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const proofResult = await pool.query(proofQuery, [postId]);

    // ==============================================================
    // STEP 3: Post Update Karo (Resolved + Photo Change)
    // ==============================================================
    
    let updateQuery;
    let values;

    if (proofResult.rows.length > 0) {
      // SCENARIO A: Contribution mil gaya -> Status 'Resolved' karo aur Photo Change karo
      const newImage = proofResult.rows[0].proof_image_url;
      
      updateQuery = `
        UPDATE posts 
        SET status = 'resolved', image_url = $1 
        WHERE id = $2 
        RETURNING id, title, image_url, status;
      `;
      values = [newImage, postId]; // $1 = newImage, $2 = postId

    } else {
      // SCENARIO B: Contribution nahi mila -> Sirf Status 'Resolved' karo (Photo same rahegi)
      updateQuery = `
        UPDATE posts 
        SET status = 'resolved' 
        WHERE id = $1 
        RETURNING id, title, status;
      `;
      values = [postId]; // $1 = postId
    }

    const result = await pool.query(updateQuery, values);

    if (result.rowCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: "Post not found" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: "Success! Status Resolved, Image Updated & Resolved Count Incremented.",
        data: result.rows[0]
      }),
    };

  } catch (error) {
    console.error("Admin Approve Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Database Error: " + error.message }),
    };
  }
};
