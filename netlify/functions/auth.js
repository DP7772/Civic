const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  // Sirf POST request allow karenge
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const data = JSON.parse(event.body);
  const { action, email, fullName, userId, password } = data;

  try {
    // ==========================================
    // SCENARIO 1: SIGN UP (Register)
    // ==========================================
    if (action === 'signup') {
      
      const checkMail = await pool.query('SELECT * FROM register_mail WHERE email = $1', [email]);

      if (checkMail.rows.length === 0) {
        return { 
          statusCode: 401, 
          body: JSON.stringify({ success: false, message: "⚠️ Email not authorized by Campus Admin." }) 
        };
      }

      const user = checkMail.rows[0];

      if (user.is_registered) {
        return { 
          statusCode: 400, 
          body: JSON.stringify({ success: false, message: "⚠️ Account already exists. Please Sign In." }) 
        };
      }

      const initials = fullName.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase();

      await pool.query(
        `UPDATE register_mail 
         SET full_name = $1, user_id = $2, password = $3, avatar_text = $4, is_registered = TRUE, civic_credits = 50 
         WHERE email = $5`,
        [fullName, userId, password, initials, email]
      );

      return { 
        statusCode: 200, 
        body: JSON.stringify({ success: true, message: "Account Created Successfully!" }) 
      };
    }

    // ==========================================
    // SCENARIO 2: SIGN IN (Login)
    // ==========================================
    if (action === 'signin') {
      
      const checkUser = await pool.query('SELECT * FROM register_mail WHERE user_id = $1', [userId]);

      if (checkUser.rows.length === 0) {
        return { 
          statusCode: 404, 
          body: JSON.stringify({ success: false, message: "❌ User ID not found." }) 
        };
      }

      const user = checkUser.rows[0];

      if (!user.is_registered) {
        return { 
          statusCode: 403, 
          body: JSON.stringify({ success: false, message: "⚠️ Account not activated. Please Sign Up first." }) 
        };
      }

      if (user.password !== password) {
        return { 
          statusCode: 401, 
          body: JSON.stringify({ success: false, message: "❌ Incorrect Password." }) 
        };
      }

      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          success: true, 
          message: "Login Successful!",
          userData: {
            name: user.full_name,
            email: user.email,
            userId: user.user_id,
            credits: user.civic_credits,
            impact: user.impact_score,
            avatar: user.avatar_text
          }
        }) 
      };
    }

    // ==========================================
    // SCENARIO 3: FETCH PROFILE (SYNC DATA) <--- YE NAYA HAI
    // ==========================================
    if (action === 'fetch_profile') {
      
      // Sirf User ID se latest data nikalo (Password ki zaroorat nahi)
      const checkUser = await pool.query('SELECT * FROM register_mail WHERE user_id = $1', [userId]);
      
      if (checkUser.rows.length > 0) {
        const user = checkUser.rows[0];
        
        return { 
          statusCode: 200, 
          body: JSON.stringify({ 
            success: true, 
            userData: { // Latest Data from DB
              name: user.full_name,
              email: user.email,
              userId: user.user_id,
              credits: user.civic_credits,
              impact: user.impact_score,
              avatar: user.avatar_text
            }
          }) 
        };
      } else {
        return { statusCode: 404, body: JSON.stringify({ success: false }) };
      }
    }

    return { statusCode: 400, body: "Invalid Action" };

  } catch (error) {
    console.error("DB Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ success: false, message: "Server Error. Try again." }) 
    };
  }
};

