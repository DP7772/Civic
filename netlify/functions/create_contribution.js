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
    
    const { 
      postId, solverEmail, proofImage, 
      country, city, region, postalCode, battery 
    } = data;

    // Validation
    if (!postId || !solverEmail || !proofImage) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing Details" }) };
    }

    // Insert into Contributions Table
    const query = `
      INSERT INTO contributions 
      (post_id, solver_email, proof_image_url, country, city, region, postal_code, battery_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;

    const values = [
      postId, solverEmail, proofImage, 
      country, city, region, postalCode, battery
    ];

    await pool.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Contribution Submitted!" }),
    };

  } catch (error) {
    console.error("Contri Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Database Error" }),
    };
  }
};
