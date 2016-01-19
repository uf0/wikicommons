var request = require('superagent'),
    d3 = require('d3'),
    csvWriter = require('csv-write-stream'),
    fs = require('fs');

var baseUrl = "https://commons.wikimedia.org/w/api.php";

var images = fs.readFileSync('data/filenames.tsv', encoding='utf8');
images = d3.tsv.parse(images)
images = images.filter(function(d){return d.image_filename})

var count = 0;
var imagesTotal = images.length;
//var imagesTotal = 100;
//console.log(imagesTotal);


var writerArticles = csvWriter({ headers: ["wikidataId", "wikicommonsId", "pictureTitle", "articleTitle", "articleWiki", "articleUrl"], separator: '\t'})
writerArticles.pipe(fs.createWriteStream('data/articles.tsv'))

//var title = 'File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg';

var getArticles = function(image){
    request
      .get(baseUrl)
      .query({
        action: 'query',
        prop: 'globalusage',
        gulimit: '100',
        titles: 'File:' + image.image_filename,
        format: 'json',
        gufilterlocal: '1'
      })
      .end(function(err, res){
        if(err){
          console.log('err')
          count++
          if((count+1) > imagesTotal){
            //write(output)
            writerArticles.end()
            return;
          }else{
            getArticles(images[count])
          }
          return
        }

        var data = JSON.parse(res.text);
        var pageId = d3.keys(data.query.pages)[0];
        var results = data.query.pages[pageId].globalusage;
        var pageTitle = data.query.pages[pageId].title;
        var gucontinue = data.continue?data.continue.gucontinue:undefined;
        results.forEach(function(d){
          var row = [image.wikidata_id, pageId, pageTitle]
          row = row.concat(d3.values(d))
          writerArticles.write(row)
        })
        console.log((count+1)+'/' + imagesTotal, image.image_filename)
        if(gucontinue){
          getGucontinue(image, gucontinue)
        }else{
          count++
          if((count+1) > imagesTotal){
            //write(output)
            writerArticles.end()
            return;
          }
          else{
            getArticles(images[count])
          }
        }


      });

}

var getGucontinue = function(image, gucontinue){
  request
    .get(baseUrl)
    .query({
      action: 'query',
      prop: 'globalusage',
      gulimit: '100',
      titles: 'File:' + image.image_filename,
      format: 'json',
      gufilterlocal: '1',
      gucontinue: gucontinue
    })
    .end(function(err, res){
      if(err){
          count++
          if((count+1) > imagesTotal){
            //write(output)
            writerArticles.end()
            return;
          }
          else{
            getArticles(images[count])
          }
        return
      }

      var data = JSON.parse(res.text);
      var pageId = d3.keys(data.query.pages)[0];
      var results = data.query.pages[pageId].globalusage;
      var pageTitle = data.query.pages[pageId].title;
      var gucontinue = data.continue?data.continue.gucontinue:undefined;
      results.forEach(function(d){
        var row = [image.wikidata_id, pageId, pageTitle]
        row = row.concat(d3.values(d))
        writerArticles.write(row)
      })

      console.log((count+1)+'/' + imagesTotal, image.image_filename)
      //console.log(results)

      if(gucontinue){
        getGucontinue(image, gucontinue)
      }else{
        count++
        if((count+1) > imagesTotal){
          //write(output)
          writerArticles.end()
          return;
        }
        else{
          getArticles(images[count])
        }
      }

    })
}
getArticles(images[count])
