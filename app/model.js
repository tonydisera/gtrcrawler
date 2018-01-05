class Model {
  constructor() {
    this.x2js = new X2JS();
    this.mergedGenes = null;
    this.selectedGenes = null;

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
                resolve({'searchTerm': searchTerm, 'diseases': Array.isArray(diseases) ? diseases : [diseases]});
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

    let rowNumber = 1;
    filteredDiseases.forEach(function(disease) {
      disease._rowNumber = rowNumber++;
      disease._genePanelCount = disease.genePanels.length;


      var mergedGenes = me.mergeGenesAcrossPanels(disease.genePanels);
      disease._geneCount = mergedGenes.length;
      disease._geneNames = mergedGenes.map(function(gene) {
        return gene.name;
      })
      .join(" ")

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

      genePanel._geneNames = genePanel._genes.map(function(gene,idx) {
        return gene.name;
      })
      .join(" ");

      genePanel._conditionNames = genePanel.conditionlist.map(function(condition) {
        return condition.name;
      })
      .join(", ");

    })

    var filteredGenePanels = genePanels.filter(function(genePanel) {
      return genePanel._genes.length > 0;
    });

    return filteredGenePanels

  }

  mergeGenePanelsAcrossDiseases(diseases) {
    var me = this;
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

      genePanel._diseaseNames = me.hashToSimpleList(genePanel._diseases, "Title", ", ");
      genePanel._diseaseCount = Object.keys(genePanel._diseases).length;
      genePanel._rowNumber = mergedGenePanels.length+1;
      mergedGenePanels.push(genePanel);
    }

    return mergedGenePanels;
  }

  mergeGenesAcrossPanels(genePanels) {
    var me = this;

    // Merge genes common across selected gene panels
    var geneMap = {};
    genePanels.forEach(function(genePanel) {
      genePanel._genes.forEach(function(gene) {
        var theGene = geneMap[gene.geneid];
        if (theGene == null) {
          gene._genePanels = {};
          gene._conditions = {};
          gene._diseases = {};
          theGene = gene;
          geneMap[gene.geneid] = theGene;
        }

        theGene._genePanels[genePanel.id] = genePanel;
        for (var uid in genePanel._diseases) {
          theGene._diseases[uid] = genePanel._diseases[uid];
        }
        genePanel.conditionlist.forEach(function(condition) {
          theGene._conditions[condition.cuid] = condition;
        })

      })
    })

    this.mergedGenes = [];
    for (var key in geneMap) {
      var gene = geneMap[key];

      gene._genePanelNames = me.hashToSimpleList(gene._genePanels, "testname", ", ");
      gene._genePanelCount = Object.keys(gene._genePanels).length;

      gene._diseaseNames = me.hashToSimpleList(gene._diseases, "Title", ", ");
      gene._diseaseCount = Object.keys(gene._diseases).length;

      gene._conditionNames = me.hashToSimpleList(gene._conditions, "name", ", ");
      gene._rowNumber      = me.mergedGenes.length+1;

      me.mergedGenes.push(gene);
    }
    return this.mergedGenes;

  }

  formatGeneRecs(genes) {
    var me = this;
    const skipFields = {_genePanels: true, _diseases: true, analytetype: true};

    var geneRecs = genes.map(function(gene, idx) {
      var hdr = "";
      if (idx == 0) {
        for (var key in gene) {
          if (!skipFields[key]) {
            if (hdr.length > 0) {
              hdr += "\t";
            }
            hdr += key;
          }
        }
        hdr += "\n";
      }
      var rec = "";
      for (var key in gene) {
        if (!skipFields[key]) {
          if (rec.length > 0) {
            rec += "\t";
          }
          rec += gene[key];
        }
      }

      return hdr + rec;
    })
    .join("\n");
    return geneRecs;
  }


  getGeneBarChartData(genes) {

    // Sort genes by gene panel count (descending order)
    // Sort genes by gene panel count (descending order)
    var sortedGenes = genes.sort(function(a,b) {
      if (a._genePanelCount == b._genePanelCount) {
        return b._diseaseCount - a._diseaseCount;
      } else {
        return b._genePanelCount - a._genePanelCount ;
      }
    })

    return sortedGenes.map(function(gene, idx) {
      return {key: idx, name: gene.name, value: +gene._genePanelCount};
    });
  }

  getGeneHistogramData(genes) {
    var histoData = [];

    // Sort genes by gene panel count (descending order)
    var sortedGenes = genes.sort(function(a,b) {
      if (a._genePanelCount == b._genePanelCount) {
        return b._diseaseCount - a._diseaseCount;
      } else {
        return b._genePanelCount - a._genePanelCount ;
      }
    })

    sortedGenes.forEach(function(gene) {
      histoData.push([histoData.length, +gene._genePanelCount, gene.name])
    });

    return histoData;
  }

  hashToSimpleList(map, fieldName, delim=" ") {
    var me = this;
    let buf = "";
    for (var key in map) {
      var theObject = map[key];
      if (buf.length > 0) {
        buf += delim;
      }
      buf += theObject[fieldName];
    }
    return buf;
  }

}

