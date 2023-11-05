/* Amplify Params - DO NOT EDIT
	API_QUOTEGENERATOR_GRAPHQLAPIIDOUTPUT
	API_QUOTEGENERATOR_QUOTEAPPDATATABLE_ARN
	API_QUOTEGENERATOR_QUOTEAPPDATATABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
// AWS packages
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

// Image generation packages
const sharp = require("sharp");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");

// update dynambodb table
async function updateQuoteDDBObject() {
  const quoteTableName = process.env.API_QUOTEGENERATOR_QUOTEAPPDATATABLE_NAME;
  const quoteObjectID = "12232-234234-234324234-234324234";

  try {
    const command = new UpdateCommand({
      TableName: quoteTableName,
      Key: {
        id: quoteObjectID,
      },
      UpdateExpression: "SET #quotesGenerated = #quotesGenerated + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
      },
      ExpressionAttributeNames: {
        "#quotesGenerated": "quotesGenerated",
      },
      ReturnValues: "UPDATED_NEW",
    });

    const response = await docClient.send(command);
    console.log(response);
    return response;
  } catch (error) {
    console.log("error updating quote object in DynamoDB", error);
  }
}

exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const apiUrl = "https://zenquotes.io/api/random";

  // Generate quote image
  async function getRandomQuotes(apiUrlInput) {
    let quoteText;
    let quoteAuthor;

    const response = await fetch(apiUrlInput);
    var quoteData = await response.json();
    console.log(quoteData);

    quoteText = quoteData[0].q;
    quoteAuthor = quoteData[0].a;
    //   console.log(quoteAuthor, quoteText);

    const width = 750;
    const height = 483;
    const text = quoteText;
    const words = text.split(" ");
    const lineBreak = 4;
    let newText = "";

    let tspanElements = "";
    for (let i = 0; i < words.length; i++) {
      newText += words[i] + " ";
      if ((i + 1) % lineBreak === 0) {
        tspanElements += `<tspan x="${
          width / 2
        }" dy="1.2em">${newText}</tspan>`;
        newText = "";
      }
    }
    if (newText !== "") {
      tspanElements += `<tspan x="${width / 2}" dy="1.2em">${newText}</tspan>`;
    }
    console.log(tspanElements);

    const svgImage = `<svg width="${width}" height="${height}">
        <style>
          .title{
            fill: #ffffff;
            font-size: 20px;
            font-weight: bold;
          }
          .quoteAuthorStyles{
            font-size: 35px;
            font-weight: bold;
            padding: 50px;
          }
          .footerStyle{
            font-size: 20px;
            font-weight: bold;
            fill: lightgrey;
            text-anchor: middle;
            font-family: Verdana;
          }
        </style>
        <circle cx="382" cy="76" r="44" fill="rgba(255,255,255,0.155)"/>
        <text x="382" y="76" dy="50" text-anchor="middle" font-size="90" font-family="Verdana" fill="white">"</text>
        <g>
          <rect x="0" y="0" width="${width}" height="auto"></rect>
            <text id="lastLineOfQuote" x="375" y="120" font-family="Verdana" font-size="35" fill="white" text-anchor="middle">
                ${tspanElements}
              <tspan class="quoteAuthorStyles" x="375" dy="1.8em">- ${quoteAuthor}</tspan>
            </text>
        </g>
        <text x="${width / 2}" y="${
      height - 30
    }" class="footerStyle">Developed by Andrew | Quotes from ZenQuotes.io
        </text>
      </svg>
    `;

    const backgroundImages = [
      "backgrounds/Evening-Sunshine.jpg",
      "backgrounds/JShine.jpg",
      "backgrounds/Metapolis.jpg",
      "backgrounds/Slight-Ocean-View.jpg",
      "backgrounds/Ultra-Voilet.jpg",
      "backgruonds/Cool-Blues.jpg",
    ];

    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const selectedBgImage = backgroundImages[randomIndex];
    const timeStamp = new Date().toLocaleString().replace(/[^\d]/g, "");
    const svgBuffer = Buffer.from(svgImage);
    const imagePath = path.join("/tmp/", "quote-card.png");

    const image = await sharp(selectedBgImage)
      .composite([
        {
          input: svgBuffer,
          top: 0,
          left: 0,
        },
      ])
      .toFile(imagePath);

    // update DynamoDB object in table
    try {
      updateQuoteDDBObject();
    } catch (error) {
      console.log("error updating quote object in DynamoDB", error);
    }
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
        "Access-Control-Allow-Origin": "*",
      },
      body: fs.readFileSync(imagePath).toString("base64"),
      isBase64Encoded: true,
    };
  }
  return await getRandomQuotes(apiUrl);
};
