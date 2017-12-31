class Model {
  constructor() {
    this.x2js = new X2JS();

  }

  promiseGetDiseases(searchTerm) {
    var me = this;

    return new Promise(function(resolve, reject) {



      var searchUrl = MEDGEN_SEARCH_URL
                      + '&usehistory=y&retmode=json'
                      + '&term='
                      + '(((' + searchTerm +'[title]) AND "in gtr"[Filter])) AND (("conditions"[Filter] OR "diseases"[Filter]))';


      $.ajax( searchUrl )
      .done(function(data) {

        if (data["esearchresult"]["ERROR"] != undefined) {
          msg = "disease search error: " + data["esearchresult"]["ERROR"];
          console.log(msg);
          reject(msg);
        } else {
          var webenv = data["esearchresult"]["webenv"];
          var queryKey = data["esearchresult"]["querykey"];

          var summaryUrl = MEDGEN_SUMMARY_URL + "&query_key=" + queryKey + "&WebEnv=" + webenv + "&usehistory=y"
          $.ajax( summaryUrl )
          .done(function(data) {

            if (data.childNodes.length < 2) {
              if (data.esummaryresult && data.esummaryresult.length > 0) {
                sumData.esummaryresult.forEach( function(message) {
                });
              }
              resolve({'searchTerm': searchTerm, 'diseases': []})
            } else {
              var results = me.x2js.xml_str2json(data.childNodes[1].innerHTML);
              if (results.ERROR) {
                if (results.ERROR == 'Empty result - nothing todo') {
                  resolve({'searchTerm': searchTerm, 'diseases': []});
                } else {
                  reject("Unable to parse disease summary results." + results.ERROR);
                }
              } else {
                var diseases = results.DocumentSummarySet.DocumentSummary;
                resolve({'searchTerm': searchTerm, 'diseases': diseases});
              }
            }
          })
          .fail(function() {
            var msg = "Error in medgen disease summary. ";
            console.log(msg);
            reject(msg);
          })
        }

      })
      .fail(function(data) {
          var msg = "Error in medgen disease search. ";
          console.log(msg)
          reject(msg);
      })

    })

  }



  promiseGetGenePanels(disease) {
    var me = this;
    return new Promise(function(resolve, reject) {



      var searchUrl = GTR_SEARCH_URL
                      + '&usehistory=y&retmode=json'
                      + '&term='
                      +  disease.ConceptId +'[DISCUI]';


      $.ajax( searchUrl )
      .done(function(data) {

        if (data["esearchresult"]["ERROR"] != undefined) {
          msg = "gene panel search error: " + data["esearchresult"]["ERROR"];
          console.log(msg);
          reject(msg);
        } else {
          var webenv = data["esearchresult"]["webenv"];
          var queryKey = data["esearchresult"]["querykey"];

          var summaryUrl = GTR_SUMMARY_URL + "&query_key=" + queryKey + "&retmode=json&WebEnv=" + webenv + "&usehistory=y"
          $.ajax( summaryUrl )
          .done(function(sumData) {

            if (sumData.result == null) {
              if (sumData.esummaryresult && sumData.esummaryresult.length > 0) {
                sumData.esummaryresult.forEach( function(message) {
                });
              }
              resolve({'disease': disease, 'genePanels': []})
            } else {
              var genePanels = [];
              for (var key in sumData.result) {
                if (key != 'uids') {
                  genePanels.push(sumData.result[key]);
                }
              }
              resolve({'disease': disease, 'genePanels': genePanels});
            }
          })
          .fail(function() {
            var msg = "Error in gtr summary. ";
            console.log(msg);
            reject(msg);
          })
        }

      })
      .fail(function(data) {
          var msg = "Error in gtr search. ";
          console.log(msg)
          reject(msg);
      })

    })

  }


  processDiseaseData(diseases) {
    var me = this;
    var filteredDiseases = diseases.filter(function(disease) {
      return disease.genePanels.length > 0;
    })

    filteredDiseases.forEach(function(disease) {
      disease._genePanelCount = disease.genePanels.length;


      var mergedGenes = me.mergeGenesAcrossPanels(disease.genePanels);
      disease._geneCount = mergedGenes.length;
      disease._geneNames = mergedGenes.map(function(gene) {
        return gene.name;
      }).join(" ")

      disease._omim = (disease.ConceptMeta && disease.ConceptMeta.OMIM && disease.ConceptMeta.OMIM.MIM) ? disease.ConceptMeta.OMIM.MIM : "";

      disease._modeOfInheritance = "";
      if (disease.ConceptMeta && disease.ConceptMeta.ModesOfInheritance) {
        for (var key in disease.ConceptMeta.ModesOfInheritance) {
          if (key == 'ModeOfInheritance') {
            var modes = Array.isArray(disease.ConceptMeta.ModesOfInheritance[key]) ? disease.ConceptMeta.ModesOfInheritance[key] : [disease.ConceptMeta.ModesOfInheritance[key]];
            modes.forEach(function(mode) {
              if (disease._modeOfInheritance.length > 0) {
                disease._modeOfInheritance += ", ";
              }
              disease._modeOfInheritance += mode.Name;
            })
          }
        }
      }
    })
    return filteredDiseases;
  }

  processGenePanelData(genePanels) {
    var me = this;
    genePanels.forEach(function(genePanel) {

      genePanel._genes = genePanel.analytes
      .filter(function(analyte) {
        return analyte.analytetype.toUpperCase() == 'GENE';
      });

      var geneNames = genePanel._genes.map(function(gene,idx) {
        return gene.name;
      });

      genePanel._geneNames = geneNames.join(" ");

    })

    var filteredGenePanels = genePanels.filter(function(genePanel) {
      return genePanel._genes.length > 0;
    });

    return filteredGenePanels

  }

  mergeGenePanelsAcrossDiseases(diseases) {

    var genePanelMap = {};

    diseases.forEach(function(disease) {
      disease.genePanels.forEach(function(genePanel) {
        var theGenePanel = genePanelMap[genePanel.id];
        if (theGenePanel == null) {
          genePanel._diseases = {};
          theGenePanel = genePanel;
          genePanelMap[genePanel.id] = theGenePanel;
        }

        theGenePanel._diseases[disease._uid] = disease;
      })
    })

    var mergedGenePanels = [];
    for (var key in genePanelMap) {
      var genePanel = genePanelMap[key];

      genePanel._diseaseNames = "";
      for (var uid in genePanel._diseases) {
        var theDisease = genePanel._diseases[uid];
        if (genePanel._diseaseNames.length > 0) {
          genePanel._diseaseNames += ", ";
        }
        genePanel._diseaseNames += theDisease.Title;
      }
      genePanel._diseaseCount = Object.keys(genePanel._diseases).length;

      mergedGenePanels.push(genePanel);
    }

    return mergedGenePanels;
  }

  mergeGenesAcrossPanels(genePanels) {

    // Merge genes common across selected gene panels
    var geneMap = {};
    genePanels.forEach(function(genePanel) {
      genePanel._genes.forEach(function(gene) {
        var theGene = geneMap[gene.geneid];
        if (theGene == null) {
          gene._genePanels = {};
          gene._diseases = {};
          theGene = gene;
          geneMap[gene.geneid] = theGene;
        }

        theGene._genePanels[genePanel.id] = genePanel;
        for (var uid in genePanel._diseases) {
          theGene._diseases[uid] = genePanel._diseases[uid];
        }

      })
    })

    var mergedGenes = [];
    for (var key in geneMap) {
      var gene = geneMap[key];


      gene._genePanelNames = "";
      for (var id in gene._genePanels) {
        var theGenePanel = gene._genePanels[id];
        if (gene._genePanelNames.length > 0) {
          gene._genePanelNames += ", ";
        }
        gene._genePanelNames += theGenePanel.testname;
      }
      gene._genePanelCount = Object.keys(gene._genePanels).length;


      gene._diseaseNames = "";
      for (var uid in gene._diseases) {
        var theDisease = gene._diseases[uid];
        if (gene._diseaseNames.length > 0) {
          gene._diseaseNames += ", ";
        }
        gene._diseaseNames += theDisease.Title;
      }
      gene._diseaseCount = Object.keys(gene._diseases).length;

      mergedGenes.push(gene);
    }
    return mergedGenes;

  }

}
