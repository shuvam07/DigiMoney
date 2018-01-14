var express = require('express');
const app = express()
const fs = require('fs');
var path = require('path')
// var db = require('./utils/connect.js')
const hbs = require('handlebars');
const sqlite3 = require('sqlite3').verbose()
var csv = require('csvtojson')
var fetch = require('node-fetch');




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


// db.serialize(function () {
//   db.run("CREATE TABLE if not exists crypto_info(name,date datetime,txVolume,txCount,marketCap,price,exchangeVolume,generatedCoins,fees)");
//   for(let i=0;i<cryptoFiles.length;i++){
//   	csv().fromFile(cryptoFiles[i])
// 	  .on('csv',(csvRow)=>{
// 	    stmt = "INSERT INTO crypto_info VALUES ('" + cryptoName[i] + "',  datetime("+csvRow[0]+")," + csvRow[1] + "," + csvRow[2] + "," + csvRow[3] + "," + csvRow[4] + "," + csvRow[5] + "," + csvRow[6] + "," + csvRow[7] +")"
// 	    console.log(stmt)
// 	    db.run(stmt)
// 	  })
// 	  .on('done', (error) => {
// 	    console.log('---->  populating crypto tables done.')
// 	  })
//   }
// })

hbs.registerHelper('inc',function(val){
	return parseInt(val)+1;
})
// hbs.registerHelper('cryptos', function(prices) {
// 	// console.log("prices");
// 	console.log(prices);
// 	cryptoPrice = prices;
// 	var cryptosFound = "";
// 	// var cryptoNotFound = "<div class=\"crypto-not-found\">No cryptos found.</div>";
// 	// if( cyptos==undefined || cryptos.length == 0)
// 	// 	return cryptosNotFound;
// 	if(cryptoPrice == undefined)
// 		return cryptosFound;
// 	for(var i=0;i<cryptoPrice.length;i++){

// 			// var tr = `<tr class=${crypto[1]}>
//    //                   <td class="rank"><span>${i+1}</span></td>
//    //                   <td class="txVolume"><<a href="/coin/${crypto.name}"><h1><span>${crypto[1]}</span></h1></a></td>
//    //                   <td class="txCount"><h1><span>${crypto[2]}</span></h1></td>
//    //                   <td class="marketCap"><h1><span>${crypto[3]}</span></h1></td>
//    //                   <td class="price"><h1><span>${crypto[4]}</span></h1></td>
//    //                   <td class="exchangeVolume"><h1><span>${crypto[5]}</span></h1></td>
//    //                   <td class="generatedCoins"><h1><span>${crypto[6]}</span></h1></td>
//    //                   <td class="fees"><h1><span>${crypto[7]}</span></h1></td>
//    //                </tr>`
//    			var tr = `<tr class=${cryptoName[i]}>
//                     	<td class="rank"><h1><span>${i+1}</span></h1></td>
//                     	<td class-"name"><a href="/coin/${cryptoName[i]}"><h1><span>${cryptoName[i]}</span></h1></a></td>
//                     	<td class="price"><h1><span>${cryptoPrice[i]}</span></h1></td>
//                       </tr>`
//             cryptosFound+=tr;
// 		}
// 		console.log(cryptosFound);
// 		return cryptosFound;
// });

async function fetchAsync () {
	
	for(let i=0;i<cryptoTicker.length;i++){
		var current=0;
		var APILink = 'https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_INTRADAY&symbol='+cryptoTicker[i]+'&market=USD&apikey=4B8Y6YJM33HZQ24O';
		// console.log(APILink)
		let intraday_data = await(await fetch(APILink)).json();
		intraday_data = intraday_data["Time Series (Digital Currency Intraday)"]
		for(let data in intraday_data){
	    	stmt = "INSERT INTO crypto_info(name,date,price,txvolume,marketCap) VALUES ('"+cryptoName[i]+ "',datetime("+data+")," + intraday_data[data]["1b. price (USD)"] + "," + intraday_data[data]["2. volume"] + "," + intraday_data[data]["3. market cap (USD)"] +")"
			console.log(stmt);
			db.run(stmt);
			// current = intraday_data[data]["1b. price (USD)"]
			// console.log(current)
		}
	}
	return "";
}

async function fetchQuery(cryptoFile,resolve,reject){
	var sql = "SELECT PRICE,MAX(DATE) FROM crypto_info WHERE NAME LIKE '"+cryptoFile+"' ORDER BY DATE";
	db.get(sql,(err,row)=>{
			if(err){
				reject(err.message);
			}
			else
				resolve(row.price);
	});
}

async function fetchDbQuery() {
	var promises = []
	for(var i=0;i<cryptoName.length;i++){
		promises.push(new Promise(function(resolve, reject) {
	      fetchQuery(cryptoName[i], resolve, reject);
	    }));
	}
	return Promise.all(promises);
}

app.get('/', function(req, res){
	fetchDbQuery()
		.then(currentData => {
			let indexTemplate = fs.readFileSync(path.resolve(__dirname+'/../client/static/templates/index.html'),"utf8");
			let compiledTemplate = hbs.compile(indexTemplate);
			var jsonArr = []
			for(var i=0;i<currentData.length;i++){
				jsonArr.push({
					cryptoTicker: cryptoTicker[i],
					cryptoName: cryptoName[i],
					price: currentData[i]
				});
			}
			let result = compiledTemplate(jsonArr);
			// console.log(result);
			res.send(result);
		})
		.catch(reason => console.log(reason.message))
});

async function getHistoricalData(crypto){
	var sql= "SELECT price,txvolume,marketCap FROM crypto_info WHERE NAME LIKE '"+crypto+"'";
	return new Promise(function(resolve,reject){
		db.all(sql,(err,rows)=>{
			if(err)
				reject(err.message);
			else{
				// console.log(rows)
				return resolve(rows);
			}
		});
	});
	
}

app.get('/coin/:crypto',function(req,res){
	
	getHistoricalData(req.params.crypto)
		.then(data => {
			// console.log(rows[0])
			let ticker = "";
			let indexTemplate = fs.readFileSync(path.resolve(__dirname+'/../client/static/templates/Coindetails.html'),"utf8");
			let compiledTemplate = hbs.compile(indexTemplate);
			for(let i=0;i<cryptoName.length;i++){
				if(cryptoName[i]==req.params.crypto){
					ticker=cryptoTicker[i];
				}
			}
			var jsonArr = {
				name:req.params.crypto,
				ticker:ticker,
				rows:data
			}
			console.log(jsonArr);
			let result = compiledTemplate(jsonArr);
			res.send(result);
		})
		.catch(reason => console.log(reason.message))
});
app.listen(3000, function(){
	console.log('listening on port 3000 ..');
})
