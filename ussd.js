const db = require("./db");

const languages = {
  en: {
    welcome: "Welcome\n1. English\n2. Swahili",
    mainMenu:
      "Main Menu:\n1. Check Balance\n2. Buy Airtime\n3. Buy Electricity\n4. Send Money\n5. Account Info\n0. Back",
    balance: "Your balance is $50",
    airtime: "You bought airtime",
    electricityStep1: "Enter PowerCash number:",
    electricityStep2: "Enter amount:",
    electricityStep3: "Enter PIN:",
    electricitySuccess: "Electricity purchase successful.",
    sendMoneyStep1: "Enter recipient number:",
    sendMoneyStep2: "Enter amount:",
    sendMoneySuccess: "Money sent successfully.",
    accountInfo:
      "Account: Ndayisaba Furaha Ben \nPhone: (+250) 790284341 \nBalance: $50",
    invalid: "Invalid choice. Try again.",
  },
  sw: {
    welcome: "Karibu\n1. Kiingereza\n2. Kiswahili",
    mainMenu:
      "Menyu Kuu:\n1. Angalia Salio\n2. Nunua Airtime\n3. Nunua Umeme\n4. Tuma Pesa\n5. Taarifa za Akaunti\n0. Rudi",
    balance: "Salio lako ni $50",
    airtime: "Umenunua airtime",
    electricityStep1: "Weka namba ya PowerCash:",
    electricityStep2: "Weka kiasi:",
    electricityStep3: "Weka PIN:",
    electricitySuccess: "Nunua umeme imekamilika.",
    sendMoneyStep1: "Weka namba ya mpokeaji:",
    sendMoneyStep2: "Weka kiasi:",
    sendMoneySuccess: "Pesa imetumwa kikamilifu.",
    accountInfo:
      "Akaunti: Ndayisaba Furaha Ben\nSimu: (+250) 790284341 \nSalio: $50",
    invalid: "Chaguo batili. Jaribu tena.",
  },
};

function getLang(input) {
  if (input === "1") return "en";
  if (input === "2") return "sw";
  return null;
}

async function handleUssd(req, res) {
  const { sessionId, phoneNumber, text } = req.body;

  const inputs = text.split("*");
  const level = inputs.length;
  const userInput = inputs[inputs.length - 1];

  let session = await db.query("SELECT * FROM sessions WHERE sessionid = $1", [
    sessionId,
  ]);

  // Create or update session
  if (session.rowCount === 0) {
    await db.query(
      "INSERT INTO sessions (sessionid, phonenumber, userinput) VALUES ($1, $2, $3)",
      [sessionId, phoneNumber, text]
    );
  } else {
    await db.query("UPDATE sessions SET userinput = $1 WHERE sessionid = $2", [
      text,
      sessionId,
    ]);
  }

  let language = session.rowCount > 0 ? session.rows[0].language : null;
  let response = "";

  // Level 1 - Language selection
  if (level === 1) {
    response = `CON ${languages.en.welcome}`;
  }

  // Level 2 - Set language
  else if (level === 2 && !language) {
    language = getLang(userInput);
    if (language) {
      await db.query("UPDATE sessions SET language = $1 WHERE sessionid = $2", [
        language,
        sessionId,
      ]);
      response = `CON ${languages[language].mainMenu}`;
    } else {
      response = `END Invalid language choice.`;
    }
  }

  // Level 3 - Main menu
  else if (level === 3 && language) {
    switch (userInput) {
      case "1": // Check balance
        response = `END ${languages[language].balance}`;
        break;
      case "2": // Buy Airtime
        await db.query(
          "INSERT INTO transactions (sessionid, phonenumber, action) VALUES ($1, $2, $3)",
          [sessionId, phoneNumber, "Buy Airtime"]
        );
        response = `END ${languages[language].airtime}`;
        break;
      case "3": // Buy Electricity Step 1
        response = `CON ${languages[language].electricityStep1}`;
        break;
      case "4": // Send Money Step 1
        response = `CON ${languages[language].sendMoneyStep1}`;
        break;
      case "5": // Account Info
        response = `END ${languages[language].accountInfo}`;
        break;
      case "0": // Back
        response = `CON ${languages[language].mainMenu}`;
        break;
      default:
        response = `END ${languages[language].invalid}`;
    }
  }

  // Buy Electricity Flow
  else if (level === 4 && inputs[2] === "3") {
    response = `CON ${languages[language].electricityStep2}`;
  } else if (level === 5 && inputs[2] === "3") {
    response = `CON ${languages[language].electricityStep3}`;
  } else if (level === 6 && inputs[2] === "3") {
    const [_, __, ___, powerCashNumber, amount, pin] = inputs;
    await db.query(
      "INSERT INTO transactions (sessionid, phonenumber, action, details) VALUES ($1, $2, $3, $4)",
      [
        sessionId,
        phoneNumber,
        "Buy Electricity",
        `PowerCash: ${powerCashNumber}, Amount: ${amount}, PIN: ${pin}`,
      ]
    );
    response = `END ${languages[language].electricitySuccess}`;
  }

  // Send Money Flow
  else if (level === 4 && inputs[2] === "4") {
    response = `CON ${languages[language].sendMoneyStep2}`;
  } else if (level === 5 && inputs[2] === "4") {
    const [_, __, ___, recipient, amount] = inputs;
    await db.query(
      "INSERT INTO transactions (sessionid, phonenumber, action, details) VALUES ($1, $2, $3, $4)",
      [
        sessionId,
        phoneNumber,
        "Send Money",
        `To: ${recipient}, Amount: ${amount}`,
      ]
    );
    response = `END ${languages[language].sendMoneySuccess}`;
  }

  // Default invalid input
  else {
    response = `END ${languages[language || "en"].invalid}`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
}

module.exports = handleUssd;
