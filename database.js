const mysql = require("mysql2");


const db = mysql.createConnection({

    host: "localhost",
    user: "root",
    password: "Rounak16@2008",
    database: "school_admin"

});


db.connect((err)=>{

    if(err){

        console.log("MySQL Connection Failed");
        console.log(err);

    }
    else{

        console.log("MySQL Connected Successfully");

    }

});


module.exports = db;