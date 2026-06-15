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
    const { action, email, accessKey } = JSON.parse(event.body);

    if (action === 'login') {
      // Database se match karo
      const query = `
        SELECT full_name, official_mail 
        FROM executives 
        WHERE official_mail = $1 AND access_key = $2
      `;
      const result = await pool.query(query, [email, accessKey]);

      if (result.rows.length > 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                adminData: result.rows[0]
            })
        };
      } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ success: false, message: "Invalid Credentials" })
        };
      }
    }

    return { statusCode: 400, body: "Invalid Action" };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Server Error" }),
    };
  }
};
