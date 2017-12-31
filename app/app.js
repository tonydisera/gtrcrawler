$(document).ready(function() {
  init();

})

function init() {

  diseaseTable = $('#disease-table').DataTable({
    data: [],
    columns: [
      { title: "ID", data: "_uid" },
      { title: "Name", data: "Title" },
      { title: "OMIM", data:  "_omim" },
      { title: "Mode of Inheritance", data: "_modeOfInheritance" },
      { title: "Gene Panel Count", data:  "_genePanelCount"  },
      { title: "Gene Count", data:  "_geneCount"  },
      { title: "Genes", data:  "_geneNames", render: $.fn.dataTable.render.ellipsis( 50 )},
    ]
  });
  diseaseTable.on( 'click', 'tr', function () {
    $(this).toggleClass('selected');
    var selectedDiseases = diseaseTable.rows('.selected').data().toArray();
    showGenePanels(selectedDiseases);
  });

  genePanelTable = $('#gene-panel-table').DataTable({
    data: [],
    columns: [
      { title: "ID", data: "id"},
      { title: "Name", data: "testname" },
      { title: "Gene Count", data:  "genecount",  },
      { title: "Genes", data:  "_geneNames", render: $.fn.dataTable.render.ellipsis( 50 )},
      { title: "Disease Count", data:  "_diseaseCount",  },
      { title: "Diseases", data:  "_diseaseNames"},
      { title: "Target Population", data: "targetpopulation", render: $.fn.dataTable.render.ellipsis( 70 ) }
    ]
  });
  genePanelTable.on( 'click', 'tr', function () {
    $(this).toggleClass('selected');
    var selectedGenePanels = genePanelTable.rows('.selected').data().toArray();
    showGenes(selectedGenePanels);
  });

  geneTable = $('#gene-table').DataTable({
    data: [],
    columns: [
      { title: "ID", data: "geneid"},
      { title: "Name", data: "name" },
      { title: "Gene Panel Count", data:  "_genePanelCount",  },
      { title: "Gene Panels", data:  "_genePanelNames",  },
      { title: "Disease Count", data:  "_diseaseCount",  },
      { title: "Diseases", data:  "_diseaseNames"}
    ]
  });

}

function performSearch() {
  $('#loading-search').removeClass("hide");
  var searchTerm = $('#input-search-term').val();

  clearTables();

  model.promiseGetDiseases(searchTerm)
  .then(function(data) {

    var diseases = data.diseases;

    var promises = [];
    data.diseases.forEach(function(disease) {

      var p = model.promiseGetGenePanels(disease)
      .then(function(data) {

        var filteredGenePanels = model.processGenePanelData(data.genePanels);
        data.disease.genePanels = filteredGenePanels;

      },
      function(error) {

      })

      promises.push(p);

    })

    Promise.all(promises)
    .then(function()
    {
      var filteredDiseases = model.processDiseaseData(diseases);
      $('#loading-search').addClass("hide");

      showDiseases(filteredDiseases);
    },
    function(error) {

    });


  },
  function(error) {

  })

}

function clearTables() {
  $('#diseases-box').addClass("hide");
  $('#gene-panels-box').addClass("hide");
  $('#genes-box').addClass("hide");

  diseaseTable.clear();
  genePanelTable.clear();
  geneTable.clear();

}

function showDiseases(diseases) {
  $('#diseases-box').removeClass("hide");
  diseaseTable.clear();
  diseaseTable.rows.add(diseases);
  diseaseTable.draw();
}

function showGenePanels(diseases) {
  $('#gene-panels-box').removeClass("hide");
  genePanelTable.clear();


  // Merge gene panels that are common across selected diseases
  mergedGenePanels = model.mergeGenePanelsAcrossDiseases(diseases);

  genePanelTable.rows.add(mergedGenePanels);
  genePanelTable.draw();
}


function showGenes(genePanels) {
  $('#genes-box').removeClass("hide");
  geneTable.clear();

  var mergedGenes = model.mergeGenesAcrossPanels(genePanels);
  geneTable.rows.add(mergedGenes);
  geneTable.draw();
}

jQuery.fn.dataTable.render.ellipsis = function ( cutoff, wordbreak, escapeHtml ) {
  var esc = function ( t ) {
    return t
      .replace( /&/g, '&amp;' )
      .replace( /</g, '&lt;' )
      .replace( />/g, '&gt;' )
      .replace( /"/g, '&quot;' );
  };

  return function ( d, type, row ) {
    // Order, search and type get the original data
    if ( type !== 'display' ) {
      return d;
    }

    if ( typeof d !== 'number' && typeof d !== 'string' ) {
      return d;
    }

    d = d.toString(); // cast numbers

    if ( d.length <= cutoff ) {
      return d;
    }

    var shortened = d.substr(0, cutoff-1);

    // Find the last white space character in the string
    if ( wordbreak ) {
      shortened = shortened.replace(/\s([^\s]*)$/, '');
    }

    // Protect against uncontrolled HTML input
    if ( escapeHtml ) {
      shortened = esc( shortened );
    }

    return '<span class="ellipsis" title="'+esc(d)+'">'+shortened+'&#8230;</span>';
  };
};