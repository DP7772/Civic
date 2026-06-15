const { Pool } = require('pg');

exports.handler = async (event, context) => {
    // Database Connection
    const pool = new Pool({
        connectionString: process.env.NETLIFY_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const { userEmail } = event.queryStringParameters;

        // Query: Public Messages + Personal Messages fetch karo
        // (Latest 20 dikhayenge)
        const query = `
            SELECT * FROM notifications 
            WHERE target_user_email = 'ALL' OR target_user_email = $1 
            ORDER BY id DESC LIMIT 20
        `;
        
        const result = await pool.query(query, [userEmail]);
        await pool.end();

        return { 
            statusCode: 200, 
            body: JSON.stringify({ success: true, data: result.rows }) 
        };

    } catch (error) {
        if(pool) await pool.end();
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
