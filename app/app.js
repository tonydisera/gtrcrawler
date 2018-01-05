$(document).ready(function() {
  init();

})

function init() {
   $('body').bootstrapMaterialDesign();

  //
  // disease table
  //
  diseaseTable = $('#disease-table').DataTable({
//    paging:         false,
//    scrollY:        170,
//    scrollCollapse: true,
    data: [],
    scrollResize: true,
    scrollY: 200,
    scrollCollapse: true,
    paging: false,
    data: [],
    columns: [
      { title: "",     data: "_rowNumber"},
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
            className: 'btn btn-raised btn-default',
            action: function ( e, dt, node, config ) {
              selectDiseases();
            }
        },
        {
            text: 'De-select all',
            className: 'btn btn-raised btn-default',
            action: function ( e, dt, node, config ) {
              deselectDiseases();
            }
        }

    ]
  });
  diseaseTable.buttons().container().appendTo( $('.data-table-buttons', diseaseTable.table().container()));
  diseaseTable.on( 'order.dt search.dt', function () {
    diseaseTable.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
      cell.innerHTML = i+1;
    });
  })
  .draw();

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
    scrollResize: true,
    scrollY: 320,
    scrollCollapse: true,
    paging: false,
    columns: [
      { title: "", data: "_rowNumber" },
      { title: "Genes", data:  "genecount"  },
      { title: "Vendor", data: "offerer", render: $.fn.dataTable.render.ellipsis( 150 )},
      { title: "Name", data: "testname", render: $.fn.dataTable.render.ellipsis( 100 )},
      { title: "Conditions", data:  "_conditionNames", render: $.fn.dataTable.render.ellipsis( 170 ) },
      { title: "Selected diseases", data:  "_diseaseCount" }
    ],
    "order": [[ 1, "desc" ], [ 2, "asc" ]],
    dom: DATA_TABLE_DOM,
    buttons: [
        {
            text: 'Select all',
            className: 'btn btn-raised btn-default',
            action: function ( e, dt, node, config ) {
              selectGenePanels();
            }
        },
        {
            text: 'Select with genes < 200',
            className: 'btn btn-raised btn-default',
            action: function ( e, dt, node, config ) {
              selectGenePanels({maxGeneCount: 200})
            }
        },
        {
            text: 'De-select all',
            className: 'btn btn-raised btn-default',
            action: function ( e, dt, node, config ) {
              deselectGenePanels();
            }
        }

    ]
  });
  genePanelTable.buttons().container().appendTo( $('.data-table-buttons', genePanelTable.table().container()));
  genePanelTable.on( 'order.dt search.dt', function () {
    genePanelTable.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
      cell.innerHTML = i+1;
    });
  })
  .draw();
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
    scrollResize: true,
    scrollY: 420,
    scrollCollapse: true,
    paging: false,
    columns: [
      { title: "", data: "_rowNumber" },
      { title: "Name", data: "name" },
      { title: "Panels", data:  "_genePanelCount",  },
      { title: "Diseases", data:  "_diseaseCount",  },
      { title: "Conditions", data: "_conditionNames",  render: $.fn.dataTable.render.ellipsis( 200 ) }
    ],
    "order": [[ 2, "desc" ], [3, "asc"]],
    dom: DATA_TABLE_DOM,
    buttons: [
        {
            text: 'Select all',
            className: 'btn btn-raised btn-default ',
            action: function ( e, dt, node, config ) {
              selectGenes();
            }
        },
        {
            text: 'Select top 100',
            className: 'btn btn-raised btn-default ',
            action: function ( e, dt, node, config ) {
              selectGenes({top: 100});
            }
        },
        {
            text: 'Deselect all',
            className: 'btn btn-raised btn-default ',
            action: function ( e, dt, node, config ) {
              deselectGenes({top: 100});
            }
        },
        {
            text: 'Copy selected',
            className: 'btn btn-raised btn-success copy-data-to-clipboard copy-genes-to-clipboard',
            action: function ( e, dt, node, config ) {
              copyGenesToClipboard(node);
            }
        },

    ]
  });
  geneTable.buttons().container().appendTo( $('.data-table-buttons', geneTable.table().container()));
  geneTable.on( 'order.dt search.dt', function () {
    geneTable.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
      cell.innerHTML = i+1;
    });
  })
  .draw();


  geneBarChart = HorizontalBarChart()
    .width(300)
    .height(300)
    .widthSmall(80)
    .on("barselect", function(selectedGeneNames) {
      model.selectedGeneNames = selectedGeneNames;
      selectGenes({selected: model.selectedGeneNames});
      $("#gene-count").text(model.selectedGeneNames.length + " of " + model.mergedGenes.length);
    });

  // Special button to copy to clipboard
  new Clipboard('.copy-data-to-clipboard');

  alertify.set('notifier','position', 'top-center');

}

function selectDiseases() {
  $(diseaseTable.rows().nodes()).addClass("selected")
  var selectedDiseases = diseaseTable.rows('.selected').data().toArray();
  showSelectedCount(diseaseTable, '#disease-count');
  showGenePanels(selectedDiseases);
}
function deselectDiseases() {
  $(diseaseTable.rows().nodes()).removeClass("selected")
  var selectedDiseases = diseaseTable.rows('.selected').data().toArray();
  showSelectedCount(diseaseTable, '#disease-count');
  showGenePanels(selectedDiseases);
}

function selectGenePanels(filterObject) {
  $(genePanelTable.rows().nodes()).removeClass("selected");

  if (filterObject) {
    var indexes = genePanelTable.rows().eq( 0 ).filter( function (rowIdx) {
      if (filterObject.hasOwnProperty('maxGeneCount')) {
        return genePanelTable.row(rowIdx).data()._genes.length < filterObject.maxGeneCount;
      }
    } );

    $(genePanelTable.rows(indexes).nodes()).addClass("selected");
  } else {
    $(genePanelTable.rows().nodes()).addClass("selected");

  }
  var selectedGenePanels = genePanelTable.rows('.selected').data().toArray();
  showSelectedCount(genePanelTable, '#gene-panel-count');
  showGenes(selectedGenePanels);
}

function deselectGenePanels() {
  $(genePanelTable.rows().nodes()).removeClass("selected");
  var selectedGenePanels = genePanelTable.rows('.selected').data().toArray();
  showSelectedCount(genePanelTable, '#gene-panel-count');
  showGenes(selectedGenePanels);
}


function selectGenes(filterObject) {
  $(geneTable.rows().nodes()).removeClass("selected");
  if (filterObject && filterObject.hasOwnProperty("top")) {

    var indices = $(geneTable.rows()[0]).slice(0,filterObject.top);
    $(geneTable.rows(indices).nodes()).addClass("selected");

  } if (filterObject && filterObject.hasOwnProperty("selected")) {

    var indices = geneTable.rows().eq( 0 ).filter( function (rowIdx) {
      return filterObject.selected.indexOf(geneTable.row(rowIdx).data().name) >= 0;
    } );
    $(geneTable.rows(indices).nodes()).addClass("selected");

  } else {

    $(geneTable.rows().nodes()).addClass("selected");

  }
  showSelectedCount(geneTable, '#gene-count');
}
function deselectGenes() {
  $(geneTable.rows().nodes()).removeClass("selected");
  var selectedGenes = geneTable.rows('.selected').data().toArray();
  showSelectedCount(geneTable, '#gene-count');
}


function copyGenesToClipboard() {
  model.selectedGeneNames = geneTable.rows(".selected").data().map(function(gene) {
    return gene.name
  })
  if (model.selectedGeneNames.length == 0) {
    alertify.error("Please select genes first.")
  } else {
    $('.copy-genes-to-clipboard').attr("data-clipboard-text", model.selectedGeneNames.join(" "));
    alertify.success(model.selectedGeneNames.length + ' gene names copied to clipboard.');
  }
}


function showSelectedCount(table, countSelector) {
  $(countSelector).text(table.rows(".selected").data().length + ' of ' + table.rows().data().length + " selected");

  if (countSelector == "#gene-count") {
    if (table.rows(".selected").data().length == 0) {
      $('#gene-table_wrapper .copy-data-to-clipboard').addClass("disabled");
    } else {
      $('#gene-table_wrapper .copy-data-to-clipboard').removeClass("disabled");
    }
  }
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

  if (diseases.length > 0) {
    $('#disease-table_wrapper').removeClass("hide");
    diseaseTable.rows.add(diseases);
    diseaseTable.draw();
    showSelectedCount(diseaseTable, '#disease-count');

  } else {
    $('#disease-table_wrapper').addClass("hide");
  }
}

function showGenePanels(diseases) {
  $('#gene-panels-box').removeClass("hide");
  genePanelTable.clear();

  $('#genes-box').addClass("hide");
  //geneTable.clear();


  // Merge gene panels that are common across selected diseases
  mergedGenePanels = model.mergeGenePanelsAcrossDiseases(diseases);

  if (mergedGenePanels.length > 0) {
    $('#gene-panel-table_wrapper').removeClass("hide");
    genePanelTable.rows.add(mergedGenePanels);
    genePanelTable.draw();
    showSelectedCount(genePanelTable, '#gene-panel-count');
  } else {
    $('#gene-panels-box').addClass("hide");
    $('#gene-panel-table_wrapper').addClass("hide");
  }
}


function showGenes(genePanels) {
  $('#genes-box').removeClass("hide");
  geneTable.clear();

  var mergedGenes = model.mergeGenesAcrossPanels(genePanels);
  $('#gene-count').text(mergedGenes.length)

  geneTable.rows.add(mergedGenes);
  geneTable.draw();

  let data = model.getGeneBarChartData(mergedGenes);
  geneBarChart(d3.select('#gene-bar-chart'), data);

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

function bodyHeight() {
  return window.innerHeight - $('.navbar').outerHeight() - 5;
}

