$(document).ready(function() {
  init();

})

function init() {

  //
  // disease table
  //
  diseaseTable = $('#disease-table').DataTable({
    paging: false,
    scrollY: "150px",
    data: [],
    columns: [
      { title: "Name", data: "Title" },
      { title: "OMIM", data:  "_omim" },
      { title: "Mode of Inheritance", data: "_modeOfInheritance" },
      { title: "Gene Panels", data:  "_genePanelCount"  },
      { title: "Genes", data:  "_geneCount"  },
    ],
    dom: DATA_TABLE_DOM,
    buttons: [
        {
            text: 'Select all',
            className: 'btn btn-raised btn-primary',
            action: function ( e, dt, node, config ) {
              $(diseaseTable.rows().nodes()).addClass("selected")
              var selectedDiseases = diseaseTable.rows('.selected').data().toArray();
              showGenePanels(selectedDiseases);
            }
        },
        {
            text: 'De-select all',
            className: 'btn btn-raised btn-primary',
            action: function ( e, dt, node, config ) {
              $(diseaseTable.rows().nodes()).removeClass("selected")
              var selectedDiseases = diseaseTable.rows('.selected').data().toArray();
              showGenePanels(selectedDiseases);
            }
        }

    ]
  });
  diseaseTable.buttons().container().appendTo( $('.col-sm-6:eq(0)', diseaseTable.table().container()));

  diseaseTable.on( 'click', 'tr', function () {
    $(this).toggleClass('selected');
    var selectedDiseases = diseaseTable.rows('.selected').data().toArray();
    showGenePanels(selectedDiseases);
  });


  //
  // gene panel table
  //
  genePanelTable = $('#gene-panel-table').DataTable({
    data: [],
    paging: false,
    scrollY: "800px",
    columns: [
      //{ title: "ID", data: "id"},
      { title: "Gene Count", data:  "genecount"  },
      { title: "Vendor", data: "offerer", render: $.fn.dataTable.render.ellipsis( 70 )},
      { title: "Name", data: "testname", render: $.fn.dataTable.render.ellipsis( 70 )},
      { title: "Genes", data:  "_geneNames", render: $.fn.dataTable.render.ellipsis( 100 )},
      { title: "Conditions", data:  "_conditionNames", render: $.fn.dataTable.render.ellipsis( 70 ) },
      { title: "For", data:  "_diseaseNames", render: $.fn.dataTable.render.ellipsis( 70 ) }
    ],
    "order": [[ 0, "desc" ], [ 1, "asc" ]],
    dom: DATA_TABLE_DOM,
    buttons: [
        {
            text: 'Select all',
            className: 'btn btn-raised btn-primary',
            action: function ( e, dt, node, config ) {
              $(genePanelTable.rows().nodes()).addClass("selected");
              var selectedGenePanels = genePanelTable.rows('.selected').data().toArray();
              showGenes(selectedGenePanels);
            }
        },
        {
            text: 'De-select all',
            className: 'btn btn-raised btn-primary',
            action: function ( e, dt, node, config ) {
              $(genePanelTable.rows().nodes()).removeClass("selected");
              var selectedGenePanels = genePanelTable.rows('.selected').data().toArray();
              showGenes(selectedGenePanels);
            }
        }

    ]
  });
  genePanelTable.buttons().container().appendTo( $('.col-sm-6:eq(0)', genePanelTable.table().container()));

  genePanelTable.on( 'click', 'tr', function () {
    $(this).toggleClass('selected');
    var selectedGenePanels = genePanelTable.rows('.selected').data().toArray();
    showGenes(selectedGenePanels);
  });

  //
  // gene  table
  //
  geneTable = $('#gene-table').DataTable({
    data: [],
    paging: false,
    scrollY: "800px",
    columns: [
      { title: "Name", data: "name" },
      { title: "Panels", data:  "_genePanelCount",  },
      { title: "Conditions", data: "_conditionNames",  render: $.fn.dataTable.render.ellipsis( 60 ) },
      { title: "For", data:  "_diseaseNames",  render: $.fn.dataTable.render.ellipsis( 60 )}
    ],
    "order": [[ 1, "desc" ], [0, "asc"]],
    dom: DATA_TABLE_DOM,
    buttons: [
        {
            text: 'Copy',
            className: 'btn btn-raised btn-primary copy-data-to-clipboard',
            action: function ( e, dt, node, config ) {
              var geneNames = geneTable.rows().data().map(function(gene) {
                return gene.name
              }).join(" ");
              node.attr("data-clipboard-text", geneNames);
              alert('Gene names copied to clipboard');
            }
        },
        {
            text: 'Copy tsv',
            className: 'btn btn-raised btn-primary copy-data-to-clipboard',
            action: function ( e, dt, node, config ) {
              geneRecs = model.formatGeneRecs(geneTable.rows().data());
              node.attr("data-clipboard-text", geneRecs);
              alert('Gene records copied to clipboard');
            }
        },


    ]
  });
  geneTable.buttons().container().appendTo( $('.col-sm-6:eq(0)', geneTable.table().container()));


  // Special button to copy to clipboard
  new Clipboard('.copy-data-to-clipboard');

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
  $('#disease-count').text(diseases.length);
  diseaseTable.clear();

  if (diseases.length > 0) {
    $('#disease-table_wrapper').removeClass("hide");
    diseaseTable.rows.add(diseases);
    diseaseTable.draw();
  } else {
    $('#disease-table_wrapper').addClass("hide");
  }
}

function showGenePanels(diseases) {
  $('#gene-panels-box').removeClass("hide");
  genePanelTable.clear();


  // Merge gene panels that are common across selected diseases
  mergedGenePanels = model.mergeGenePanelsAcrossDiseases(diseases);
  $('#gene-panel-count').text(mergedGenePanels.length);

  if (mergedGenePanels.length > 0) {
    $('#gene-panel-table_wrapper').removeClass("hide");
    genePanelTable.rows.add(mergedGenePanels);
    genePanelTable.draw();
  } else {
    $('#gene-panel-table_wrapper').addClass("hide");
  }
}


function showGenes(genePanels) {
  $('#genes-box').removeClass("hide");
  geneTable.clear();

  var mergedGenes = model.mergeGenesAcrossPanels(genePanels);
  $('#gene-count').text(mergedGenes.length);

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