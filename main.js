const request = require("request");
const cheerio = require("cheerio");
const xlsx = require('xlsx');


let seriesId = "series/ipl-2021-1249214";
let url = "https://www.espncricinfo.com/" + seriesId;

request(url, requestCallBack);

function requestCallBack(err, res, html){
    if (err){
        console.log(err);
    }else {
        const $ = cheerio.load(html);
        let matchesFixturesAndResultsUrl = "https://www.espncricinfo.com/" + $('[data-hover="Fixtures and Results"]').attr('href');

        request(matchesFixturesAndResultsUrl, callBackForMatchesFixturesAndResults);
    }
}


function callBackForMatchesFixturesAndResults(err, res, html){
    if (err){
        console.log(err);
    }else {
        const $ = cheerio.load(html);
        let matchesResultsUrl = "https://www.espncricinfo.com/" + $($('.widget-tabs.team-scores-tabs.card .widget-tab-link')[1]).attr('href');
        // console.log(matchesResultsUrl);
        request(matchesResultsUrl, callBackForMatchesResults);
    }
}

// this callBackForMatchesResults is used to fetch Urls of all the matches

async function callBackForMatchesResults(err, res, html){
    if (err){
        console.log(err);
    }else {
        const $ = cheerio.load(html);
        let scorecardAnchorTags =  $('.match-cta-container [data-hover = "Scorecard"]');

        // creation of workbook
        let matchObj = [];
        const wb = xlsx.utils.book_new();
        let scorecardUrls = [];
        for (let i = 0; i < scorecardAnchorTags.length; i++){
            matchObj.push([[], [], [], []]);
        };

        // console.log(matchObj);
        // console.log(matchObj.length);
        let teamFirst = [];
        let teamSecond = [];
        let matchName = [];

        for (let i = 0; i < scorecardAnchorTags.length; i++){
            scorecardUrls.push(
                "https://www.espncricinfo.com/" + $(scorecardAnchorTags[i]).attr('href')
            );
        

            // // fetcing team names
            teamFirst.push(scorecardUrls[i].split("/")[6].split("-")[0]);
            teamSecond.push(scorecardUrls[i].split("/")[6].split("-vs-")[1].split("-")[0]);

        }

        for (let i = 0; i < scorecardAnchorTags.length; i++){
            matchName.push(
                teamFirst[i] + "-vs-" + teamSecond[i]
            );
        }

        // console.log(matchName);

        for (let i = 0; i < scorecardAnchorTags.length; i++){
            scorecardUrls.push(
                "https://www.espncricinfo.com/" + $(scorecardAnchorTags[i]).attr('href')
            );

            request(scorecardUrls[i], callBackForScorecard.bind(this,matchName, wb, i, matchObj));

        }
    }
}


// scorecard function call, from here we will scrap the tables of both the innings
let countForCalls = 0;
function callBackForScorecard(matchName, wb, index, matchObj, err, res, html){
    countForCalls++;
    
    if (err){
        console.log(err);
    }else {
        const $ = cheerio.load(html);
        let batsmenTablesArray = $('.table.batsman'); 
        let bowlerTablesArray = $('.table.bowler');
        let idx = 0;

        // making of batsmen objects of both the teams and pushing them to the matchObj

        for (let i = 0; i < batsmenTablesArray.length; i++){

            let batsmenTable = $($(batsmenTablesArray)[i]).html();
            let batsmenTableRows = $(batsmenTable).find('tbody > tr');
            for (let i = 0; i < batsmenTableRows.length - 1; i++){
                let batsmenTableColumnsArray = $(batsmenTableRows[i]).find('td');
                if (batsmenTableColumnsArray.length == 1){
                    continue;
                }
                matchObj[index][idx].push({
                    Batsmen : $(batsmenTableColumnsArray[0]).text(),
                    Runs : $(batsmenTableColumnsArray[2]).text(),
                    Balls : $(batsmenTableColumnsArray[3]).text(),
                    Fours : $(batsmenTableColumnsArray[5]).text(),
                    Sixes : $(batsmenTableColumnsArray[6]).text(),
                    Strike_Rate : $(batsmenTableColumnsArray[7]).text()
                });
            } 

            idx++;
            
        }
        
        // making of bowlers table
        for (let i = 0; i < bowlerTablesArray.length; i++){

            let bowlerTable = $($(bowlerTablesArray)[i]).html();
            let bowlerTableRows = $(bowlerTable).find('tbody > tr');
            for (let i = 0; i < bowlerTableRows.length - 1; i++){
                let bowlerTableColumnsArray = $(bowlerTableRows[i]).find('td');
                if (bowlerTableColumnsArray.length == 1){
                    continue;
                }
                matchObj[index][idx].push({
                    Bowler : $(bowlerTableColumnsArray[0]).text(),
                    Overs : $(bowlerTableColumnsArray[1]).text(),
                    Maidens : $(bowlerTableColumnsArray[2]).text(),
                    Runs : $(bowlerTableColumnsArray[3]).text(),
                    Wickets : $(bowlerTableColumnsArray[4]).text(),
                    Economy : $(bowlerTableColumnsArray[5]).text(),
                    Zeroes : $(bowlerTableColumnsArray[6]).text(),
                    Fours : $(bowlerTableColumnsArray[5]).text(),
                    Sixes : $(bowlerTableColumnsArray[5]).text(),
                    WD : $(bowlerTableColumnsArray[5]).text(),
                    NB : $(bowlerTableColumnsArray[5]).text()
                });
            } 

            idx++;
            
        }

        if (countForCalls == matchObj.length){

            // appending sheets to the workbook
            for (let i = 0; i < matchObj.length; i++){

                let teamFirst = matchName[i].split("-vs-")[0];
                let teamSecond = matchName[i].split("-vs-")[1];
                let teams = [];
                teams.push(teamFirst);
                teams.push(teamSecond);

                for (let j = 0; j < 4; j++){
                    if (j <= 1){
                        let ws = xlsx.utils.json_to_sheet(matchObj[i][j]);
                        xlsx.utils.book_append_sheet(wb, ws, "Match-" + [matchObj.length - i] + "-" + teams[j] + "-Batsmen");
                        xlsx.writeFile(wb, 'resultsIPL21.xlsx');
                    }else {
                        let ws = xlsx.utils.json_to_sheet(matchObj[i][j]);
                        xlsx.utils.book_append_sheet(wb, ws, "Match-" + [matchObj.length - i] + "-" + teams[j - 2] + "-Bowlers");
                        xlsx.writeFile(wb, 'resultsIPL21.xlsx');
                    }
                }
            }
        }

        
        

        
    }
}
