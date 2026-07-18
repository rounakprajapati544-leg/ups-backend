require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const path = require("path");


const db = require("./database");


const app = express();


const razorpay = new Razorpay({

    key_id: process.env.RAZORPAY_KEY_ID,

    key_secret: process.env.RAZORPAY_KEY_SECRET

});


app.use(cors());
app.use(express.json());

// Serve School Website files
app.use(express.static("D:\\UPS System\\School Website"));




app.get("/",(req,res)=>{

    res.send("UPS Backend Running");

});

app.post("/admission", (req, res) => {

    const data = req.body;

    const sql = `
    INSERT INTO online_admission_requests
    (
        StudentName,
        FatherName,
        MotherName,
        DOB,
        ClassApplied,
        MobileNo,
        Aadhaar,
        Email,
        Address
    )
    VALUES (?,?,?,?,?,?,?,?,?)
    `;

    db.query(sql, [

        data.student,
        data.father,
        data.mother,
        data.dob,
        data.class,
        data.mobile,
        data.aadhaar,
        data.email,
        data.address

    ], (err, result) => {

        if (err) {

            console.log(err);

            return res.json({
                success: false
            });

        }

        const applicationID =
            "UPS" +
            new Date().getFullYear() +
            String(result.insertId).padStart(5, "0");

        const updateSql = `
        UPDATE online_admission_requests
        SET ApplicationID = ?
        WHERE RequestID = ?
        `;

        db.query(updateSql, [

            applicationID,
            result.insertId

        ], (err) => {

            if (err) {

                console.log(err);

                return res.json({
                    success: false
                });

            }

            res.json({

                success: true,
                applicationID: applicationID

            });

        });

    });

});

app.get("/admission-requests",(req,res)=>{


const sql = `
SELECT * 
FROM online_admission_requests
ORDER BY RequestID DESC
`;


db.query(sql,(err,result)=>{


if(err){

console.log(err);

res.json({
success:false
});

}

else{

res.json({

success:true,
data:result

});

}

app.post("/save-online-payment",(req,res)=>{


const data=req.body;


const receiptNo="RCPT"+Date.now();



const sql = `

INSERT INTO online_fee_payments
(
ReceiptNo,
AdmissionNo,
StudentName,
FatherName,
Class,
FeeType,
PaymentMonth,
Amount,
PaymentMode,
RazorpayOrderID,
RazorpayPaymentID,
Status
)

VALUES
(?,?,?,?,?,?,?,?,?,?,?,?)

`;



db.query(sql,[

receiptNo,

data.admissionNo,

data.studentName,

data.fatherName,

data.className,

data.feeType,

data.paymentMonth,

data.amount,

data.paymentMode,

data.razorpayOrderID,

data.razorpayPaymentID,

data.status


],(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false

});

}



res.json({

success:true,

receiptNo:receiptNo

});


});


});

app.get("/online-fee-payments",(req,res)=>{


db.query(

"SELECT * FROM online_fee_payments ORDER BY PaymentID DESC",

(err,result)=>{


if(err){

console.log(err);

return res.json([]);

}


res.json(result);


});


});


});


});



app.get("/admission-statistics",(req,res)=>{


const sql = `

SELECT

COUNT(*) AS total,

SUM(Status='Pending') AS pending,

SUM(Status='Approved') AS approved,

SUM(Status='Rejected') AS rejected,

SUM(DATE(RequestDate)=CURDATE()) AS newToday

FROM online_admission_requests

`;


db.query(sql,(err,result)=>{


if(err){

console.log(err);

res.json({
success:false
});

}

else{

res.json({

success:true,

data:result[0]

});

}


});


});

app.get("/admission/:id",(req,res)=>{

const id=req.params.id;


const sql =
"SELECT * FROM online_admission_requests WHERE RequestID=?";


db.query(sql,[id],(err,result)=>{


if(err){

console.log(err);

res.json({
success:false
});

}

else{

res.json({

success:true,
data:result[0]

});

}


});


});

app.get("/search-admission",(req,res)=>{

const name = req.query.name || "";
const date = req.query.date || "";
const status = req.query.status || "";
const classApplied = req.query.class || "";


let sql = `
SELECT * 
FROM online_admission_requests
WHERE 1=1
`;

let values = [];


if(name){

sql += " AND StudentName LIKE ?";
values.push("%"+name+"%");

}


if(date){

sql += " AND DATE(RequestDate)=?";
values.push(date);

}


if(status){

sql += " AND Status=?";
values.push(status);

}


if(classApplied){

sql += " AND ClassApplied=?";
values.push(classApplied);

}



sql += " ORDER BY RequestID DESC";



db.query(sql,values,(err,result)=>{


if(err){

console.log(err);

res.json({
success:false
});

}

else{

res.json({

success:true,
data:result

});

}


});


});


// ======================================
// APPROVE ADMISSION AND MOVE TO STUDENTS
// ======================================

app.put("/approve-admission/:id",(req,res)=>{

const id = req.params.id;


// GET ADMISSION DETAILS

const getSql = `
SELECT *
FROM online_admission_requests
WHERE RequestID=?
`;


db.query(getSql,[id],(err,result)=>{


if(err){

console.log(err);

return res.json({
success:false,
message:"Database Error"
});

}


if(result.length===0){

return res.json({

success:false,

message:"Admission Request Not Found"

});

}


const student = result[0];


// GENERATE ADMISSION NUMBER

const admissionNo =
"UPS"
+
new Date().getFullYear()
+
Math.floor(10000 + Math.random()*90000);



// INSERT INTO STUDENTS TABLE

const insertSql = `

INSERT INTO students

(
AdmissionNo,
StudentName,
FatherName,
MotherName,
Class,
DOB,
MobileNo,
AadharNo,
Email,
Address,
AdmissionDate,
Status
)

VALUES
(?,?,?,?,?,?,?,?,?,?,CURDATE(),'Active')

`;



db.query(insertSql,[


admissionNo,

student.StudentName,

student.FatherName,

student.MotherName,

student.ClassApplied,

student.DOB,

student.MobileNo,

student.Aadhaar || "",

student.Email || "",

student.Address || ""


],(err)=>{


if(err){

console.log(err);

return res.json({

success:false,

message:"Student Insert Failed"

});

}



// UPDATE ONLINE REQUEST

const updateSql = `

UPDATE online_admission_requests

SET

Status='Approved',

AdmissionNo=?

WHERE RequestID=?

`;



db.query(updateSql,[admissionNo,id],(err)=>{


if(err){

console.log(err);

return res.json({

success:false,

message:"Admission Update Failed"

});

}



res.json({

success:true,

message:"Admission Approved Successfully",

AdmissionNo:admissionNo

});


});


});


});


});





// ===============================
// DELETE ADMISSION REQUEST
// ===============================

app.delete("/delete-admission/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
    DELETE FROM online_admission_requests
    WHERE RequestID = ?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {

            console.log(err);

            return res.json({
                success: false
            });

        }

        if (result.affectedRows === 0) {

            return res.json({
                success: false
            });

        }

        res.json({
            success: true
        });

    });

});

// ===============================
// MARK ADMISSION AS PENDING
// ===============================

app.put("/pending-admission/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
    UPDATE online_admission_requests
    SET Status='Pending'
    WHERE RequestID=?
    `;

    db.query(sql, [id], (err, result) => {

        if(err){

            console.log(err);

            return res.json({
                success: false
            });

        }

        res.json({
            success: true
        });

    });

});

app.get("/check-admission-status", (req, res) => {

    const applicationID = req.query.applicationID;
    const mobile = req.query.mobile;

    const sql = `
    SELECT
        ApplicationID,
        StudentName,
        ClassApplied,
        Status,
        RequestDate
    FROM online_admission_requests
    WHERE ApplicationID = ?
    AND MobileNo = ?
    `;

    db.query(sql, [applicationID, mobile], (err, result) => {

        if (err) {

            console.log(err);

            return res.json({
                success: false
            });

        }

        if (result.length === 0) {

            return res.json({
                success: false
            });

        }

        res.json({

            success: true,
            data: result[0]

        });

    });

});

// ======================================
// ONLINE FEE COLLECTION REPORT API
// ======================================

app.get("/fee-report", (req, res) => {

    const className = req.query.className || "";
    const search = req.query.search || "";

    let sql = `

    SELECT

        ReceiptNo,
        AdmissionNo,
        StudentName,
        Class,
        FeeType,
        PaymentMonth,
        Amount,
        PaymentMode,
        Status,
        PaymentDate

    FROM online_fee_payments

    WHERE 1=1

    `;

    let values = [];

    if (className) {

        sql += " AND Class=?";

        values.push(className);

    }

    if (search) {

        sql += `

        AND
        (
            StudentName LIKE ?
            OR AdmissionNo LIKE ?
        )

        `;

        values.push("%" + search + "%");
        values.push("%" + search + "%");

    }

    sql += " ORDER BY PaymentDate DESC";

    db.query(sql, values, (err, result) => {

        if (err) {

            console.log(err);

            return res.json({
                success: false
            });

        }

        res.json({

            success: true,

            data: result

        });

    });

});

// ======================================
// FEE STATISTICS API
// ======================================

app.get("/fee-statistics",(req,res)=>{


const sql = `

SELECT


IFNULL(SUM(Amount),0) AS TotalCollection,


IFNULL(
SUM(
CASE 
WHEN MONTH(PaymentDate)=MONTH(CURDATE())
AND YEAR(PaymentDate)=YEAR(CURDATE())
THEN Amount
ELSE 0
END
),0
) AS MonthlyCollection,


COUNT(DISTINCT AdmissionNo) AS PaidStudents


FROM fee_payments

WHERE Status='Success'

`;



db.query(sql,(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false

});

}



res.json({

success:true,

data:result[0]

});


});


});

// ======================================
// STUDENT STATISTICS API
// ======================================

app.get("/student-statistics",(req,res)=>{

const sql = `

SELECT

COUNT(*) AS TotalStudents,

SUM(
CASE
WHEN AdmissionDate = CURDATE()
THEN 1
ELSE 0
END
) AS NewAdmissions,

SUM(
CASE
WHEN Status='Active'
THEN 1
ELSE 0
END
) AS ActiveStudents,

SUM(
CASE
WHEN Status='Inactive'
THEN 1
ELSE 0
END
) AS InactiveStudents

FROM students

`;

db.query(sql,(err,result)=>{

if(err){

console.log(err);

return res.json({

success:false

});

}

res.json({

success:true,

data:result[0]

});

});

});

// ======================================
// GET SINGLE STUDENT DETAILS API
// ======================================

app.get("/student/:id",(req,res)=>{

const id = req.params.id;


const sql = `

SELECT *

FROM students

WHERE StudentID=?

`;


db.query(sql,[id],(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false

});

}


if(result.length === 0){

return res.json({

success:false,

message:"Student Not Found"

});

}


res.json({

success:true,

data:result[0]

});


});


});


// ======================================
// DELETE STUDENT API
// ======================================

app.delete("/student/:id",(req,res)=>{


const id = req.params.id;


const sql = `

DELETE FROM students

WHERE StudentID=?

`;



db.query(sql,[id],(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false

});

}



if(result.affectedRows === 0){

return res.json({

success:false,

message:"Student Not Found"

});

}



res.json({

success:true,

message:"Student Deleted Successfully"

});


});


});

// ======================================
// UPDATE STUDENT DETAILS API
// ======================================

app.put("/student/:id",(req,res)=>{

const id = req.params.id;


const {

StudentName,
FatherName,
MotherName,
MobileNo,
AadharNo,
Category,
Class,
Section,
DOB,
Gender,
Email,
Address,
Status

}=req.body;



const sql = `

UPDATE students

SET

StudentName=?,
FatherName=?,
MotherName=?,
MobileNo=?,
AadharNo=?,
Category=?,
Class=?,
Section=?,
DOB=?,
Gender=?,
Email=?,
Address=?,
Status=?

WHERE StudentID=?

`;



db.query(sql,[

StudentName,
FatherName,
MotherName,
MobileNo,
AadharNo,
Category,
Class,
Section,
DOB,
Gender,
Email,
Address,
Status,
id

],(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false

});

}



res.json({

success:true,

message:"Student Updated Successfully"

});


});


});

// ======================================
// SEARCH STUDENTS API
// ======================================

app.get("/search-students",(req,res)=>{

const name = req.query.name || "";
const admissionNo = req.query.admissionNo || "";
const className = req.query.class || "";
const section = req.query.section || "";
const status = req.query.status || "";

let sql = `

SELECT

StudentID,
AdmissionNo,
StudentName,
FatherName,
MotherName,
Class,
Section,
MobileNo,
AdmissionDate,
Status

FROM students

WHERE 1=1

`;

let values = [];

if(name){

sql += " AND StudentName LIKE ?";
values.push("%"+name+"%");

}

if(admissionNo){

sql += " AND AdmissionNo LIKE ?";
values.push("%"+admissionNo+"%");

}

if(className){

sql += " AND Class=?";
values.push(className);

}

if(section){

sql += " AND Section=?";
values.push(section);

}

if(status){

sql += " AND Status=?";
values.push(status);

}

sql += " ORDER BY StudentID DESC";

db.query(sql,values,(err,result)=>{

if(err){

console.log(err);

return res.json({

success:false

});

}

res.json({

success:true,

data:result

});

});

});

// ======================================
// ADD STUDENT API
// ======================================

app.post("/add-student",(req,res)=>{


const {

StudentName,
FatherName,
MotherName,
MobileNo,
AadharNo,
Category,
Class,
DOB,
Address

}=req.body;



// Generate Admission Number

let admissionNo =
"UPS"
+
new Date().getFullYear()
+
Math.floor(10000 + Math.random()*90000);



const sql = `

INSERT INTO students

(
AdmissionNo,
StudentName,
FatherName,
MotherName,
Class,
DOB,
MobileNo,
AadharNo,
Category,
Address,
AdmissionDate,
Status
)

VALUES
(?,?,?,?,?,?,?,?,?,?,CURDATE(),'Active')

`;



db.query(

sql,

[
admissionNo,
StudentName,
FatherName,
MotherName,
Class,
DOB,
MobileNo,
AadharNo,
Category,
Address
],

(err,result)=>{


if(err){

console.log(err);


return res.json({

success:false,

message:"Student Registration Failed"

});


}



res.json({

success:true,

message:
"Student Added Successfully\nAdmission No : "
+
admissionNo

});


});


});

// ======================================
// ADMIN LOGIN API
// ======================================

app.post("/login",(req,res)=>{


const {

username,
password

}=req.body;



const sql = `

SELECT *

FROM admin_users

WHERE Username = ?

AND Password = ?

AND Status = 'Active'

`;



db.query(

sql,

[
username,
password
],

(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false,

message:"Database Error"

});

}



if(result.length === 0){

return res.json({

success:false,

message:"Invalid Username or Password"

});

}



res.json({

success:true,

message:"Login Successful",

user:{

AdminID:result[0].AdminID,

Username:result[0].Username,

FullName:result[0].FullName,

Role:result[0].Role

}

});


});


});

// ======================================
// GET ALL STUDENTS API
// ======================================

app.get("/students",(req,res)=>{

const sql = `

SELECT

StudentID,
AdmissionNo,
StudentName,
FatherName,
MotherName,
Class,
Section,
MobileNo,
AdmissionDate,
Status

FROM students

ORDER BY StudentID DESC

`;

db.query(sql,(err,result)=>{

if(err){

console.log(err);

return res.json({

success:false

});

}

res.json({

success:true,

data:result

});

});

});

// ======================================
// MAKE FEE PAYMENT
// ======================================

app.post("/make-fee-payment",(req,res)=>{


const{

AdmissionNo,
FeeHead,
Amount,
PaymentDate,
PaymentMethod

}=req.body;



// Check Student

const sql=`

SELECT

StudentID,
AdmissionNo,
StudentName,
FatherName,
Class,
Section

FROM students

WHERE AdmissionNo=?
OR RollNo=?

LIMIT 1

`;



db.query(sql,[AdmissionNo,AdmissionNo],(err,result)=>{


if(err){

return res.status(500).json(err);

}



if(result.length===0){

return res.json({

success:false,

message:"Roll No Not Exists"

});

}



const student=result[0];



// Generate Receipt Number

const receiptNo =
"UPS" + Date.now().toString().slice(-6);




// Insert Payment

const insertSQL=`

INSERT INTO fee_payments

(
ReceiptNo,
AdmissionNo,
StudentName,
Class,
Amount,
PaymentDate,
PaymentMethod,
PaymentType,
Status

)

VALUES (?,?,?,?,?,?,?,?,?)

`;



db.query(

insertSQL,

[

receiptNo,

student.AdmissionNo,

student.StudentName,

student.Class,

Amount,

PaymentDate,

PaymentMethod,

"Offline",

"Success"

],



(insertErr)=>{



if(insertErr){

return res.status(500).json(insertErr);

}



// Return Data


res.json({

success:true,

receiptNo:receiptNo,

student:student,

amount:Amount,

feeHead:FeeHead,

paymentDate:PaymentDate,

paymentMethod:PaymentMethod,

status:"Paid"


});



});



});


});


// =======================================
// CREATE RAZORPAY ORDER
// =======================================

app.post("/create-order", async (req, res) => {

    try {

        const { amount } = req.body;

        if (!amount || amount <= 0) {

            return res.status(400).json({

                success: false,

                message: "Invalid Amount"

            });

        }

        const options = {

            amount: Math.round(amount * 100), // Convert ₹ to paise

            currency: "INR",

            receipt: "UPS_" + Date.now()

        };

        const order = await razorpay.orders.create(options);

        res.json({

            success: true,

            key: process.env.RAZORPAY_KEY_ID,

            order

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Unable to create Razorpay Order"

        });

    }

});


// ======================================
// CREATE RAZORPAY ORDER API
// ======================================

app.post("/create-order", async (req, res) => {

    try {

        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount."
            });
        }

        const options = {

            amount: Math.round(amount * 100), // Convert ₹ to paise

            currency: "INR",

            receipt: "UPS_" + Date.now()

        };

        const order = await razorpay.orders.create(options);

        res.json({

            success: true,

            key: process.env.RAZORPAY_KEY_ID,

            order: order

        });

    }

    catch (error) {

        console.error("Razorpay Error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to create Razorpay Order"

        });

    }

});


// ======================================
// CHECK STUDENT FOR FEE PAYMENT
// ======================================

app.post("/check_fee", (req, res) => {

    const admissionNo = req.body.admission_no;

    console.log("Checking Admission:", admissionNo);


    const sql = `
        SELECT
            AdmissionNo,
            StudentName,
            FatherName,
            Class,
            Section
        FROM students
        WHERE AdmissionNo = ?
        LIMIT 1
    `;


    db.query(sql, [admissionNo], (err, result) => {

        if (err) {

            console.log(err);

            return res.json({
                error: "Database Error"
            });

        }


        if (result.length === 0) {

            return res.json({
                error: "Admission Number Not Found"
            });

        }


        res.json({
            student: result[0]
        });


    });

});


app.post("/save-online-payment",(req,res)=>{


const data=req.body;


const receiptNo="RCPT"+Date.now();



const sql = `
INSERT INTO online_fee_payments
(
ReceiptNo,
AdmissionNo,
StudentName,
FatherName,
Class,
FeeType,
PaymentMonth,
Amount,
PaymentMode,
RazorpayOrderID,
RazorpayPaymentID,
Status
)

VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
`;



db.query(sql,[

receiptNo,
data.admissionNo,
data.studentName,
data.fatherName,
data.className,
data.feeType,
data.paymentMonth,
data.amount,
data.paymentMode,
data.razorpayOrderID,
data.razorpayPaymentID,
data.status

],(err,result)=>{


if(err){

console.log("Database Error:",err);

return res.json({

success:false

});

}


console.log("Payment Saved:",receiptNo);


res.json({

success:true,

receiptNo:receiptNo

});


});


});


app.get("/online-fee-payments",(req,res)=>{


db.query(

"SELECT * FROM online_fee_payments ORDER BY PaymentID DESC",

(err,result)=>{


if(err){

console.log(err);

return res.json([]);

}


res.json(result);


});


});


app.get("/receipt/:receiptNo",(req,res)=>{

const receiptNo=req.params.receiptNo;

const sql=`

SELECT *

FROM online_fee_payments

WHERE ReceiptNo=?

LIMIT 1

`;

db.query(sql,[receiptNo],(err,result)=>{

if(err){

console.log(err);

return res.json({
success:false
});

}

if(result.length===0){

return res.json({
success:false
});

}

res.json({

success:true,

data:result[0]

});

});

});


app.get("/payment-statistics", (req, res) => {

    const sql = `
        SELECT
            COUNT(*) AS TotalPayments,
            SUM(CASE WHEN Status='Success' THEN 1 ELSE 0 END) AS SuccessfulPayments,
            SUM(CASE WHEN Status='Pending' THEN 1 ELSE 0 END) AS PendingPayments,
            SUM(CASE WHEN Status='Failed' THEN 1 ELSE 0 END) AS FailedPayments
        FROM online_fee_payments
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.log(err);
            return res.json({
                success: false
            });
        }

        res.json({
            success: true,
            data: result[0]
        });

    });

});

app.get("/fee-report", (req, res) => {

    const sql = `

        SELECT

        ReceiptNo,
        AdmissionNo,
        StudentName,
        Class,
        FeeType,
        PaymentMonth,
        Amount,
        PaymentMode,
        Status

        FROM online_fee_payments

        ORDER BY PaymentDate DESC

        `;

    db.query(sql, (err, result) => {

        if (err) {
            console.log(err);
            return res.json({
                success: false
            });
        }

        res.json({
            success: true,
            data: result
        });

    });

});

// ======================================
// ALL FEE PAYMENT REPORT
// ======================================

app.get("/fee-payment-report", (req, res) => {

    const sql = `

    SELECT 
        ReceiptNo,
        AdmissionNo,
        StudentName,
        Class,
        'Online' AS PaymentType,
        FeeType,
        PaymentMonth,
        Amount,
        PaymentMode,
        PaymentDate,
        Status

    FROM online_fee_payments


    UNION ALL


    SELECT
        ReceiptNo,
        AdmissionNo,
        StudentName,
        Class,
        PaymentType,
        NULL AS FeeType,
        NULL AS PaymentMonth,
        Amount,
        PaymentMethod AS PaymentMode,
        PaymentDate,
        Status

    FROM fee_payments


    ORDER BY PaymentDate DESC

    `;


    db.query(sql, (err, result) => {

        if (err) {

            console.log("FEE REPORT SQL ERROR:", err);

            return res.status(500).json({
                success: false,
                error: err.message
            });

        }


        res.json({
            success: true,
            data: result
        });

    });

});

// ======================================
// OFFLINE FEE COLLECTION REPORT
// ======================================

app.get("/offline-fee-report", (req, res) => {


    const sql = `

    SELECT

    ReceiptNo,
    AdmissionNo,
    StudentName,
    Class,
    Amount,
    PaymentDate,
    PaymentMethod,
    PaymentType,
    Status

    FROM fee_payments

    ORDER BY PaymentDate DESC

    `;


    db.query(sql, (err,result)=>{


        if(err){

            console.log("OFFLINE REPORT ERROR:",err);

            return res.json({

                success:false

            });

        }


        res.json({

            success:true,

            data:result

        });


    });


});

// ======================================
// ADD NOTICE API
// ======================================

app.post("/add-notice",(req,res)=>{


const {

title,
description,
noticeDate,
status

}=req.body;



const sql = `

INSERT INTO notices
(
Title,
Description,
NoticeDate,
Status
)

VALUES (?,?,?,?)

`;



db.query(

sql,

[
title,
description,
noticeDate,
status
],

(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false,
message:"Database Error"

});

}



res.json({

success:true,
message:"Notice Added Successfully"

});


}


);


});

// ======================================
// GET ACTIVE NOTICES API
// ======================================

app.get("/notices",(req,res)=>{


const sql = `

SELECT *

FROM notices

WHERE Status='Active'

ORDER BY NoticeID DESC

`;



db.query(sql,(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false,
message:"Database Error"

});

}



res.json({

success:true,
data:result

});


});


});

// ======================================
// GET ALL NOTICES (ADMIN)
// ======================================

app.get("/all-notices",(req,res)=>{


const sql = `

SELECT *

FROM notices

ORDER BY NoticeID DESC

`;



db.query(sql,(err,result)=>{


if(err){

console.log(err);

return res.json({

success:false,
message:"Database Error"

});

}



res.json({

success:true,
data:result

});


});


});

// ======================================
// DELETE NOTICE API
// ======================================

app.delete("/delete-notice/:id", (req, res) => {

    const noticeId = req.params.id;

    const sql = `
        DELETE FROM notices
        WHERE NoticeID = ?
    `;

    db.query(sql, [noticeId], (err, result) => {

        if (err) {
            console.log(err);

            return res.json({
                success: false,
                message: "Database Error"
            });
        }

        res.json({
            success: true,
            message: "Notice Deleted Successfully"
        });

    });

});

// ======================================
// GET SINGLE NOTICE
// ======================================

app.get("/notice/:id", (req, res) => {

    const noticeId = req.params.id;

    const sql = `
        SELECT *
        FROM notices
        WHERE NoticeID = ?
    `;

    db.query(sql, [noticeId], (err, result) => {

        if (err) {

            console.log(err);

            return res.json({
                success: false,
                message: "Database Error"
            });

        }

        res.json({
            success: true,
            data: result[0]
        });

    });

});

// ======================================
// UPDATE NOTICE
// ======================================

app.put("/update-notice/:id", (req, res) => {

    const noticeId = req.params.id;

    const {

        title,
        description,
        noticeDate,
        status

    } = req.body;

    const sql = `
        UPDATE notices
        SET
            Title = ?,
            Description = ?,
            NoticeDate = ?,
            Status = ?
        WHERE NoticeID = ?
    `;

    db.query(

        sql,

        [
            title,
            description,
            noticeDate,
            status,
            noticeId
        ],

        (err, result) => {

            if (err) {

                console.log(err);

                return res.json({
                    success: false,
                    message: "Database Error"
                });

            }

            res.json({
                success: true,
                message: "Notice Updated Successfully"
            });

        }

    );

});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});