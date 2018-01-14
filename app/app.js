var express = require('express');
const app = express()
const fs = require('fs');
var path = require('path')
// var db = require('./utils/connect.js')
const hbs = require('handlebars');
const sqlite3 = require('sqlite3').verbose()
var csv = require('csvtojson')



app.use('/static',express.static(path.join(__dirname, '/../client/static')));

// const dbPath='./migrate/archives.db'
const btc='./migrate/btc.csv'
const doge='./migrate/doge.csv'
const eth='./migrate/eth.csv'
const ltc='./migrate/ltc.csv'

const cryptoFiles = [btc,doge,eth,ltc] 
const cryptoTicker = []
for(var i=0;i<cryptoFiles.length;i++){
	cryptoTicker.push(cryptoFiles[i].split('/').pop().split('.')[0].toUpperCase());
}
const cryptoName = ["Bitcoin","Dogecoin","Ethereum","Litecoin"] 
var db = new sqlite3.Database('archives.db');


db.serialize(function () {
  db.run("CREATE TABLE if not exists crypto_info (name date txVolume txCount marketCap price exchangeVolume generatedCoins fees)");
  for(let i=0;i<cryptoFiles.length;i++){
  	csv().fromFile(cryptoFiles[i])
	  .on('csv',(csvRow)=>{
	    stmt = "INSERT INTO crypto_info VALUES ('" + cryptoName[i] + "'," + csvRow[0] + "," + csvRow[1] + "," + csvRow[2] + "," + csvRow[3] + "," + csvRow[4] + "," + csvRow[5] + "," + csvRow[6] + "," + csvRow[7] +")"
	    console.log(stmt)
	    db.run(stmt)
	  })
	  .on('done', (error) => {
	    console.log('---->  populating crypto tables done.')
	  })
  }
})


hbs.registerHelper('cryptos', function(data) {
	// console.log(cryptos);
	cryptoPrice = data.data;
	var cryptosFound = "";
	// var cryptoNotFound = "<div class=\"crypto-not-found\">No cryptos found.</div>";
	// if( cyptos==undefined || cryptos.length == 0)
	// 	return cryptosNotFound;
	if(cryptoPrice == undefined)
		return cryptosFound;
	for(var i=0;i<cryptoPrice.length;i++){

			// var tr = `<tr class=${crypto[1]}>
   //                   <td class="rank"><span>${i+1}</span></td>
   //                   <td class="txVolume"><<a href="/coin/${crypto.name}"><h1><span>${crypto[1]}</span></h1></a></td>
   //                   <td class="txCount"><h1><span>${crypto[2]}</span></h1></td>
   //                   <td class="marketCap"><h1><span>${crypto[3]}</span></h1></td>
   //                   <td class="price"><h1><span>${crypto[4]}</span></h1></td>
   //                   <td class="exchangeVolume"><h1><span>${crypto[5]}</span></h1></td>
   //                   <td class="generatedCoins"><h1><span>${crypto[6]}</span></h1></td>
   //                   <td class="fees"><h1><span>${crypto[7]}</span></h1></td>
   //                </tr>`
   			var tr = `<tr class=${cryptoName[i]}>
                    	<td class="rank"><span>${i+1}</span></td>
                    	<td class-"name"><span>$${cryptoName[i]}</span></td>
                    	<td class="price"><h1><span>${cryptoPrice[i]}</span></h1></td>
                      </tr>`
            cryptosFound+=tr;
		}
		return cryptosFound;
});

async function fetchAsync () {
	var currentData =[]
	for(i=0;i<cryptoTicker;i++){
		var current=0;
		var APILink = 'https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_INTRADAY&symbol='+cryptoTicker[i]+'&market=USD&apikey=4B8Y6YJM33HZQ24O';
		let intraday_data = await(await fetch(APILink)).json();
		intraday_data = intraday_data["Time Series (Digital Currency Intraday)"]
		for(let data in intraday_data){
			current = intraday_data[data]["1b. price (USD)"]
		}
		currentData.push(current);
	}
	
	return currentData;
}

app.get('/', function(req, res){
	fetchAsync()
		.then(data => {
			let indexTemplate = fs.readFileSync(path.resolve(__dirname+'/../client/static/templates/index.html'),"utf8");
			let compiledTemplate = hbs.compile(indexTemplate);
			let result = compiledTemplate(data);
			console.log(result);
			res.send(result);
		})
		.catch(reason => console.log(reason.message))
});

app.listen(3000, function(){
	console.log('listening on port 3000 ..');
})



	