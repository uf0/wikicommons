var request = require('superagent'),
    d3 = require('d3'),
    csvWriter = require('csv-write-stream'),
    fs = require('fs');

var baseUrl = "https://www.wikidata.org/w/api.php";

//https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q21716860&format=json&props=claims
//https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q132783&format=json&props=labels

var images = fs.readFileSync('data/filenames.tsv', encoding='utf8');
images = d3.tsv.parse(images)
images = images.filter(function(d){return d.image_filename})

var count = 1911;
var imagesTotal = images.length;
//var imagesTotal = 1;

var writeInstitution = csvWriter({ headers: ["wikidataId", "institutionId", "institution"], separator: '\t'})
writeInstitution.pipe(fs.createWriteStream('data/institution.tsv'))

var getEntities = function(image){
    request
      .get(baseUrl)
      .query({
        action: 'wbgetentities',
        ids: 'Q'+image.wikidata_id,
        props: 'claims',
        format: 'json'
      })
      .end(function(err, res){
        if(err){
          console.log('err')
          count++
          if((count+1) > imagesTotal){
            //write(output)
            writeInstitution.end()
            return;
          }else{
            getEntities(images[count])
          }
          return
        }

        var data = JSON.parse(res.text);
        var pageId = d3.keys(data.entities)[0];
        var claim = data.entities[pageId].claims['P195'];


        if(claim){
          var claimbkp = claim[0].id
          claimbkp = claimbkp.split('$')[0].replace('Q','')
          var claimId = claim[0]['mainsnak']['datavalue']?claim[0]['mainsnak']['datavalue']['value']['numeric-id']:claimbkp;
          request
            .get(baseUrl)
            .query({
              action: 'wbgetentities',
              ids: 'Q'+claimId,
              props: 'labels',
              format: 'json',
              languages: 'en',
              languagefallback: 'true'
            })
            .end(function(err, res){
              if(err){
                console.log('err')
                count++
                if((count+1) > imagesTotal){
                  //write(output)
                  writeInstitution.end()
                }else{
                  getEntities(images[count])
                }
              }

              var data = JSON.parse(res.text);
              var label = data.entities['Q'+claimId]['labels']['en']
              var labelKeys = d3.keys(data.entities['Q'+claimId]['labels']);
              var bckpLabel = labelKeys[0]
              label = label?label.value:bckpLabel?data.entities['Q'+claimId]['labels'][bckpLabel].value:'';
              var institution = label
              var row = [image.wikidata_id, claimId, institution]
              writeInstitution.write(row)
              console.log((count+1)+'/' + imagesTotal, image.image_filename)
              count++
              if((count+1) > imagesTotal){
                //write(output)
                writeInstitution.end()
              }
              else{
                getEntities(images[count])
              }
            })

        }else{
          var institution = '';
          var institutionId = '';
          var row = [image.wikidata_id, institutionId, institution]
          writeInstitution.write(row)
          console.log((count+1)+'/' + imagesTotal, image.image_filename)
          count++
          if((count+1) > imagesTotal){
            //write(output)
            writeInstitution.end()
          }
          else{
            getEntities(images[count])
          }
        }

      });

}

getEntities(images[count])
