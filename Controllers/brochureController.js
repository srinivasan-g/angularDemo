var popupCategory = [];
var popupVehicleName = "";
(function () {
  'use strict';

  function brochureCtrl($scope, $state, $filter, $log, $q, $timeout,
    brochureService, cachingService, commonFunctionService, $location, $anchorScroll,
    $rootScope, $modal, selectionStepBackToService, optionsBuildService, removeVehicleService,
    translationService, compareEquipService, benchMarkReplaceServices, shelfServices, $stateParams,
    startingStepsService, selectionStepService, legendService, dataSharingService, cachingBuiltVehicles, jatoNetServices, $sce,
    segmentsCacheService, quoteManagerService, wlcTitleLandingPageService, httpPathService) {

    var self = this;
    var cachedUserState = {};
    self.images = [];
    self.imagesObjectList = [];
    self.pageLoading = false;
    self.addlist = '';
    self.buildOptionList = [];
    var catCount = 0;
    self.spinnerLoading = false;
    self.brochurePage = "brochurePage";
    var categoryId, categoryName;
    self.userShelfInfo = shelfServices.getRestoredShelfInfoSync();
    self.activeCompareVehicleId = 0;
    self.jatoNewsObj = [];
    var startingSteps = null;
    popupCategory = [];

    self.optionBuildOpen = true;

    self.isCategoryOpen = {};
    self.areAllOpen = false;

    legendService.display.visible = true;

    var vehiclesSelection = null;
    self.builtVehicles = [];
    self.displayBuiltOptions = [];
    var cachedBuiltVehiclesIds = [];
    self.titleToDisplay = 'Brochure';

    var brochureSettings = dataSharingService.brochureSettings || {};
    self.quoteInput = {};

    self.gotoScrollvehicle = function (index) {
      $location.hash('builtVehicle' + index);
      $anchorScroll();
    };

    self.populateOptions = function (vehicleId, catId, catName, catTranslated) {
      categoryId = catId;
      categoryName = catName;
      var content = jQuery('#vehicleoptions' + vehicleId + ' #' + catId + ' .content');
      var options = getFormattedOptions(vehicleId, catName, catTranslated);
      content.html(options);
    };

    function resetCompareEquipIcon(currentUserState) {
      self.activeCompareVehicleId = 0;
      cachingService.set(null, 'activeCompareVehicleId', self.activeCompareVehicleId);
      currentUserState.masterCompareVehicleId = 0;
      currentUserState.isCompareEquip = false;
      cachingService.setUserState(currentUserState);
    }

    function getFormattedOptions(vehicleId, catName, catTranslated) {
      var data = '';
      var option;
      var description;
      // Find vehicle
      var vehicles = $filter('filter')(self.builtVehicles, { vehicleId: vehicleId });
      var getTitle = function (optionCode, optionDescription) {
        if (optionCode === null || optionDescription === null) return "Not available";
        return '[' + optionCode + '] ' + optionDescription;
      };
      if (!vehicles.length || vehicles.length < 1) return '';
      // Find category
      var categories = $filter('filter')(vehicles[0].ebrochurePageOptions, { categoryName: catName });
      if (!categories.length || categories.length < 1) return '';
      var category = categories[0];
      // popupCategory = [];
      var popcategoryfilter = $filter('filter')(popupCategory, { vehicleId: vehicleId });
      if (popcategoryfilter.length === 0) {
        var categoryObject = { vehicleId: {}, vehicleName: vehicles[0].vehicleName, category: [] };
        categoryObject.vehicleId = vehicleId;
        categoryObject.category.push(category);
        popupCategory.push(categoryObject);
      } else {
        for (var t = 0; t < popupCategory.length; t++) {
          if (popupCategory[t].vehicleId === vehicleId) {
            popupCategory[t].category.push(category);
          }
        }
      }
      // get formatted data
      if (category) {
        for (var i = 0; i < category.options.length; i++) {
          option = category.options[i];
          data += '<tr ><td class="text-left col-md-6">' + option.ebrochureText + '</td><td class="text-right col-md-6"><p style="word-break: break-all;">';
          if (option.formattedValues !== null) {
            for (var g = 0; g < option.formattedValues.length; g++) {
              if (option.formattedValues[g].isIcon) {
                var myRegExp = /option.png/i;
                if (myRegExp.test(option.formattedValues[g].source)) {
                  description = '<a onclick="displayHelpInfo(' + vehicles[0].vehicleId + ',\'' + vehicles[0].vehicleHeaderInfo.specsDatabaseName + '\',\'';
                  description += vehicles[0].vehicleHeaderInfo.price + '\',\'' + catTranslated + '\',\'' + i + '\',\'' + self.brochurePage;
                  description += '\')" style="text-decoration:none" ><img src="' + option.formattedValues[g].source + '" alt=""';
                  description += ' title="' + getTitle(option.formattedValues[g].optionCode, option.formattedValues[g].optionDescription) + '"';
                  description += ' /> </a>' + "&nbsp; ";
                  data += description;
                } else {
                  data += '<img src="' + option.formattedValues[g].source + '" alt="" />' + "&nbsp; ";
                }
              } else {
                data += option.formattedValues[g].label + " ";
              }
            }
          }
          data += '</p></td></tr>';
        }
      }
      return data;
    }

    //Close Option Popup Panel
    $scope.closePopUpPanel = function () {
      $(".optionPopUpBgDisable").css("pointer-events", "");
      $('#myModal').modal('hide');
      $('#myModal .modal-dialog').removeAttr('style');
    };


    function init() {
      //Get the user state
      cachedUserState = cachingService.getUserState();

      if (cachedUserState.isAuthentic) {
        cachedUserState.ipAddress = commonFunctionService.getClientIpAddress();
        //Set the adding vehicles flag
        dataSharingService.isAddingVehicles = false;

        //Clear the segments cache
        segmentsCacheService.clear();

        //Set the loading flag
        self.pageLoading = true;

        //Get the cached info
        loadCache(cachedUserState)
          .then(function () {
            //Load the data if an input is available
            if (vehiclesSelection && vehiclesSelection.markets &&
              vehiclesSelection.markets.length !== 0) {
              //Load the data
              loadDataAsync(cachedUserState)
                .finally(function () {
                  //Clear the vehicle selection cache
                  clearVehicleSelectionCacheAsync();
                  //Set the loading flag
                  self.pageLoading = false;
                });
            } else {
              initBuiltVehicles();

              //Set the loading flag
              self.pageLoading = false;
            }
          })
          .catch(function (error) {
            //Set the loading flag
            self.pageLoading = false;
          });
      } else {
        $state.go('login');
      }
    }

    function loadCache(userState) {
      var dfd = $q.defer();

      var cachePromises = [];
      var translationPromise = cachingService.get(null, 'translations', translationService.loadTranslations, [userState]);
      var vehiclesSelPromise = cachingService.get('vehicleSelectionCache', 'vehiclesSelection', {}), activeComparePromise = cachingService.get(null, 'activeCompareVehicleId', 0);
      var builtVehiclesCollectionPromise = cachingBuiltVehicles.get(), startingStepsPromise = cachingService.get(null, 'startingsteps', startingStepsService.load);

      //Wait for the cache to be loaded
      cachePromises.push(translationPromise);
      cachePromises.push(vehiclesSelPromise);
      cachePromises.push(activeComparePromise);
      cachePromises.push(builtVehiclesCollectionPromise);
      cachePromises.push(startingStepsPromise);

      $q.all(cachePromises)
        .then(function (values) {
          //Assign the cached values
          $scope.applicationText = values[0];
          vehiclesSelection = values[1];
          self.activeCompareVehicleId = values[2] || userState.masterCompareVehicleId;
          cachedBuiltVehiclesIds = values[3];
          startingSteps = values[4];
          //Display or hide WLC Tite
          var wlcTitleLandingPage = wlcTitleLandingPageService;
          wlcTitleLandingPage.wlcTitleLandinPage = false;



          //Display or hide Saved Selection Icon
          var wlcSaved = wlcTitleLandingPageService;
          if (wlcSaved.wlcBasketActive) {
            wlcSaved.wlcSavedSelection = true;
          }

          //Apply the translations
          applyTranslations();

          //Resolve the promise
          dfd.resolve();
        })
        .catch(function (error) {
          //Reject the promise
          dfd.reject(error);
        });

      return dfd.promise;
    }

    function loadDataAsync() {
      return $q(function (resolve, reject) {
        //Load the data async
        var getBuiltVehiclesPromise = brochureService.build(vehiclesSelection, httpPathService.brochureSelectionPath);

        //Add the promises to the list
        var promisesList = [];
        promisesList.push(getBuiltVehiclesPromise);

        //Wait far all the promises
        $q.all(promisesList)
          .then(function (values) {
            //Add the new selections to the cached built vehicles
            var startIdx = dataSharingService.replaceVehicleIndex === null || typeof dataSharingService.replaceVehicleIndex === "undefined"
              ? cachedBuiltVehiclesIds.length
              : dataSharingService.replaceVehicleIndex;
            cachingBuiltVehicles.addAt(startIdx, getVehicleSelectionIds(vehiclesSelection))
              .then(function () {
                //Assign the data using the right order
                self.builtVehicles = getSortedBuiltVehicles(values[0].builtVehicles || [], cachedBuiltVehiclesIds);

                self.displayBuiltOptions = values[0].buildOptionList || [];

                //Add the built vehicles to the cached user state
                //TODO - at the moment we have to do it because the built vehicles from the user state are used everywhere. The right thing to do should be to cache the built vehicles and retrieve them from the cache whenever you need to use it
                cachedUserState.builtVehicles = self.builtVehicles;
                cachedUserState.displayBuiltOptions = self.displayBuiltOptions;

                initBuiltVehicles();
              });

            //Cache the latest selected markets
            cachingService.set(null, 'lastSelectedMarkets', vehiclesSelection.markets.map(function (db) {
              return { databaseName: db.databaseName };
            }));

            //Resolve the promise
            resolve('success');
          })
          .catch(function (error) {
            //Display the message
            toastr.error(error);

            //Reject the promise
            reject(error);
          })
          .finally(function () {
            //Clean up
            dataSharingService.replaceVehicleIndex = null;
          });
      });
    }

    function getSortedBuiltVehicles(builtVehicles, idsOrder) {
      var vehicles = builtVehicles || [],
        ids = idsOrder || [],
        ordVehicles = new Array(vehicles.length);

      if (vehicles.length !== ids.length)
        return vehicles;

      vehicles.forEach(function (vehicle) {
        ordVehicles[ids.indexOf(+vehicle.vehicleId)] = vehicle;
      });

      return ordVehicles;
    }

    function setVehicleWidthStyle(vehiclesNum) {
      switch (vehiclesNum) {
        case 1:
          self.vehicleWidthClass = "col-md-10 col-md-offset-1";
          break;
        case 2:
          self.vehicleWidthClass = "col-md-6";
          break;
        case 3:
          self.vehicleWidthClass = "col-md-4";
          break;
        default:
          self.vehicleWidthClass = "col-md-3";
          break;
      }
    }

    function applyTranslations() {
      self.titleToDisplay = $stateParams.brochuretype === "missing" ? $scope.applicationText.tryGet("differences") : $scope.applicationText.tryGet("brochure");
    }

    function getVehicleSelectionIds(input) {
      if (!input || !Array.isArray(input.markets)) {
        return [];
      }

      var outIds = [];

      var markets = input.markets;

      markets.forEach(function (market) {
        var vehicles = market.vehicles || [];

        vehicles.forEach(function (vehicle) {
          var id = +vehicle.vehicleId;
          if (id) {
            outIds.push(id);
          }
        });
      });

      return outIds;
    }

    function clearVehicleSelectionCacheAsync() {
      //Nuke the vehicle selection cache
      cachingService.nukeController('vehicleSelectionCache');
    }

    function initBuiltVehicles() {
      //Copy the data from the user state back to the objects
      self.builtVehicles = cachedUserState.builtVehicles;
      self.displayBuiltOptions = cachedUserState.displayBuiltOptions;

      //Set the vehicle column width
      setVehicleWidthStyle(self.builtVehicles.length);

      //User state
      cachedUserState.toBeRemovedReplacedVehicleId = 0;

      //Automatic build
      self.showAutomaticBuild = self.builtVehicles.length > 1;
      $scope.$emit('advantageVehicles', self.builtVehicles.length);

      // format data
      buildVehicleNames(self.builtVehicles);
      buildVehicleOptions(self.builtVehicles);
      buildVehicleImages(self.builtVehicles);

      //Mark all categories as not open
      if (self.builtVehicles && self.builtVehicles.length !== 0) {
        (self.builtVehicles[0].ebrochurePageOptions || []).forEach(function (category) {
          self.isCategoryOpen[category.categoryName] = {};
          self.isCategoryOpen[category.categoryName].open = false;
        });
      }

      //Build Option
      self.buildOptionList = commonFunctionService.buildOptionList;
      if (!cachedUserState.displayBuiltOptions) {
        cachedUserState.displayBuiltOptions = [];
      }
      if (self.buildOptionList === null && cachedUserState.displayBuiltOptions.length > 0) {
        getOptionSuccess({ data: cachedUserState });
      }

      //History data
      cachedUserState.hasHistoryData = cachedUserState.hasHistoryData || false;
      cachedUserState.historyData = cachedUserState.historyData || false;
      $scope.$emit('droppedhistoryData', cachedUserState.hasHistoryData, cachedUserState.historyData);
    }

    self.galleryDisable = function (vehicleId) {
      var hide = true;
      var gallery = $filter('filter')(self.builtVehicles, { vehicleId: vehicleId });
      if (gallery[0].vehiclePhotos.length === 0) {
        hide = false;
      }
      return hide;
    };

    function buildVehicleOptions(builtVehicles) {
      for (var v = 0; v < builtVehicles.length; v++) {
        builtVehicles[v].ebrochurePageOptions = [];
        var vehicle = builtVehicles[v];
        if (vehicle.vehicleEbrochurePage) {
          for (var i = 0; i < vehicle.vehicleEbrochurePage.pageItem.length; i++) {
            var option = vehicle.vehicleEbrochurePage.pageItem[i];
            if ($stateParams.brochuretype === "missing") {
              if (!option.isHidden) {
                option.optionImage = option.formattedValues[0].source;
                addBuildVehicleOption(vehicle, option);
              }
            } else {
              option.optionImage = option.formattedValues[0].source;
              addBuildVehicleOption(vehicle, option);
            }
          }
        }
      }
    }

    function addBuildVehicleOption(vehicle, row) {
      var counter = 0;
      var option = {};
      if (!('ebrochurePageOptions' in vehicle)) vehicle.ebrochurePageOptions = [];

      var categories = $filter('filter')(vehicle.ebrochurePageOptions, { categoryName: row.categoryName });
      var category;
      for (counter = 0; counter < row.formattedValues.length; counter++) {
        if (row.formattedValues[counter].optionId > 0 && row.formattedValues[counter].optionCode !== null) {
          option = row.formattedValues[counter];
        }
      }
      if (!categories.length || categories.length < 1) {
        category = { id: ++catCount, categoryName: row.categoryName, translatedCategoryName: row.translatedCategoryName, vehicleId: row.vehicleId, options: [] };
        vehicle.ebrochurePageOptions.push(category);
      } else {
        category = categories[0];
      }

      if (row.ebrochureFormat === null)
        row.ebrochureFormat = '';

      //var isImage = false;
      category.options.push({
        translatedCategoryName: row.translatedCategoryName,
        categoryName: row.categoryName,
        attributes: row.attributeNodes,
        optionDescription: option.optionDescription,
        optionCode: option.optionCode,
        optionImage: row.optionImage,
        ebrochureText: row.ebrochureText,
        ebrochureFormat: row.ebrochureFormat,
        formattedValues: row.formattedValues,
        optionId: row.optionId,
        optionPrice: row.price,
        isImage: false
      });

    }

    function schemaFilter(vehicle, schemaId) {
      return $filter('filter')(vehicle.vehicleHeaderInfo.vehicleHeaders, { schemaId: schemaId })[0].dataValue;
    }

    function buildVehicleNames(builtVehicles) {
      for (var i = 0; i < builtVehicles.length; i++) {
        var vehicle = builtVehicles[i];

        var make128 = schemaFilter(vehicle, 128);
        var model129 = schemaFilter(vehicle, 129);
        var version131 = schemaFilter(vehicle, 131);
        var my108 = schemaFilter(vehicle, 108);
        var doors605 = schemaFilter(vehicle, 605);
        var body606 = $filter('filter')(vehicle.vehicleHeaderInfo.vehicleHeaders, { schemaId: 606 })[0].fullText;
        var country109 = schemaFilter(vehicle, 109);
        vehicle.vehicleHeaderInfo.countryName = $filter('filter')(vehicle.vehicleHeaderInfo.vehicleHeaders, { schemaId: 109 })[0].fullText;
        var door602 = schemaFilter(vehicle, 602);
        var bodyCode603 = schemaFilter(vehicle, 603);
        var modelYear108 = schemaFilter(vehicle, 108);

        vehicle.vehicleName = make128 + ' ' + model129 + ' ' + doors605 + $scope.applicationText.tryGet("dr") + ' ' + body606 + ' - ' + my108 + '\n' + version131;
        $scope.pageLoading = false;
        self.jatoNewsObj.push({ 'VehLangId': cachedUserState.defaultLanguage, 'vehCountry': country109, 'vehVehicleType': vehicle.vehicleHeaderInfo.vehicleType, 'vehLocalMake': make128, 'vehLocalModel': model129, 'vehLocalDoors': door602, 'vehLocalBody': bodyCode603, 'vehFuelType': vehicle.vehicleHeaderInfo.fuelType, 'vehModelYear': modelYear108, 'numOfArticles': "10", 'vehicleId': builtVehicles[i].vehicleId, 'vehLocalVersion': version131 });
        if (cachingService.droppedVehicles.length > 0) {
          $scope.compareVehiclesAdd = true;
          $scope.$emit('droppedVehiclesAdd', $scope.compareVehiclesAdd, cachingService.droppedVehicles);
        }
      }
    }

    function buildVehicleImages(builtVehicles) {
        if (!$rootScope.vehicleImages)
            $rootScope.vehicleImages = [];
        for (var i = 0; i < builtVehicles.length; i++) {
            var vehicle = builtVehicles[i];
            if (!$rootScope.vehicleImages[i]) {
                $rootScope.vehicleImages[i] = { url: builtVehicles[i].vehicleHeaderInfo.vehiclePhotoPath.photoPath, id: builtVehicles[i].vehicleId}
            }
        }
    }

    /*Drop Vehicle*/
    var reloadBuildVehicles = false;
    $scope.onDropComplete = function (dropVehicle, dragVehicle) {
      self.spinnerLoading = true;

      //Swap the items in the cached ids
      cachingBuiltVehicles.swap(dragVehicle.vehicleId, dropVehicle.vehicleId);
      //Get the indexes
      var draggedIdx = self.builtVehicles.indexOf(dragVehicle),
        droppedIdx = self.builtVehicles.indexOf(dropVehicle);

      //Swap the vehicles
      if (draggedIdx !== -1 && droppedIdx !== -1) {
        var dropVehicleCopy = angular.copy(dropVehicle);

        self.builtVehicles[droppedIdx] = angular.copy(self.builtVehicles[draggedIdx]);
        self.builtVehicles[draggedIdx] = dropVehicleCopy;

       //swap the pictures too
        var dropVehiclePicCopy = angular.copy($rootScope.vehicleImages[droppedIdx]);

        $rootScope.vehicleImages[droppedIdx] = angular.copy($rootScope.vehicleImages[draggedIdx]);
        $rootScope.vehicleImages[draggedIdx] = dropVehiclePicCopy;

        //Clear the categories for the swapped vehicles
        //The angular.copy triggers the ng-init because the object does have a new reference
        popupCategory[droppedIdx] = {};
        popupCategory[draggedIdx] = {};
      }

      //If Benchmark Replace
      if (dropVehicle.isBenchmark || dragVehicle.isBenchmark) {
        reloadBuildVehicles = true;
        self.activeCompareVehicleId = 0;

        //Prepare the user state
        //Swap the benchmark
        cachedUserState.benchmarkId = dragVehicle.isBenchmark ? dropVehicle.vehicleId : dragVehicle.vehicleId;
        cachedUserState.ipAddress = commonFunctionService.getClientIpAddress();

        //Call the API
        benchMarkReplaceServices.getBenchMarkReplace(cachedUserState).then(getOptionSuccess, getOptionFailure)
          .finally(function () { reloadBuildVehicles = false; });
      } else {
        self.spinnerLoading = false;
      }
    };

    // All Brochure Panel Open/Close
    self.brochurePanelActive = false;
    self.brochurePanel = function (data) {
      var list = $('.brochureIconChange').length;
      var i, j;
      if (!data) {
        for (i = 0; i < list; i++) {
          j = self.builtVehicles[i].vehicleId;
          $('#vehicleoptions' + [j]).collapse('show');
          $('.panel-title').attr('data-toggle', '');
          self.brochurePanelActive = true;
        }
      } else {
        for (i = 0; i < list; i++) {
          j = self.builtVehicles[i].vehicleId;
          $('#vehicleoptions' + [j]).collapse('hide');
          $('.panel-title').attr('data-toggle', '');
          self.brochurePanelActive = false;
        }
      }
    };

    self.closeAllCategoriesOnOptionBuild = function () {
      angular.forEach(self.isCategoryOpen, function (value, key) {
        value.open = false;
      });
    };

    self.toggleCategory = function (category) {
      for (var i = 0; i < self.builtVehicles.length; i++) {
        var categoryData = $filter('filter')(self.builtVehicles[i].ebrochurePageOptions, { categoryName: category.categoryName });
        self.populateOptions(self.builtVehicles[i].vehicleId, categoryData[0].id, categoryData[0].categoryName, categoryData[0].translatedCategoryName);
      }
    };

    self.toggleThisCategory = function (category, vehicle) {
      var timer = $timeout(function () {
        var categoryData = $filter('filter')(vehicle.ebrochurePageOptions, { categoryName: category.categoryName });
        self.populateOptions(vehicle.vehicleId, categoryData[0].id, categoryData[0].categoryName, categoryData[0].translatedCategoryName);
      }, 0);

      $scope.$on("$destroy", function (event) {
        $timeout.cancel(timer);
      });
    };

    self.toggleAllOpen = function () {
      self.areAllOpen = !self.areAllOpen;
      angular.forEach(self.isCategoryOpen, function (value, key) {
        value.open = self.areAllOpen;
      });
    };

    $rootScope.$on('collapseevent', function (event, data) {
      var list = $('.collapse').length;
      var i;
      if (data) {
        for (i = 0; i < list; i++) {
          $('#vehicle' + [i]).removeClass('in');
          $('.optionsIconChange a').addClass('collapsed');
        }
      } else {
        for (i = 0; i < list; i++) {
          $('#vehicle' + [i]).addClass('in');
          $('.optionsIconChange a').removeClass('collapsed');
        }
      }
    });

    /**Show News**/
    var jatoNewsData = {};
    self.vehicleNews = function (selectVehicle) {
      self.newsLoading = true;
      if (self.jatoNewsObj.some(function (vehicle) {
        jatoNewsData = vehicle;
        return vehicle.vehicleId === selectVehicle.vehicleId;
      })) {
        jatoNetServices.getNews(jatoNewsData)
          .then(function (result) {
            if (result.length > 0) {
              cachingService.set(null, 'jatoNetNews', result);
              cachingService.set(null, 'newsVehicle', selectVehicle);
              self.newsLoading = false;
              $state.go('Carspecs.News');
            } else {
              toastr.error("No News ");
              self.newsLoading = false;
            }
          }, function (error) {
            if (error === "401 - Unauthorized") {
              toastr.error("Please buy licence to see news.");
              self.newsLoading = false;
            } else {
              toastr.error(error);
              self.newsLoading = false;
            }

          });

      }
    };

    /**Show gallery**/
    $scope.showcargalleryObj = {};
    self.openLightboxModal = function (index, vehicleId, vehicleName) {
      if (self.imagesObjectList.length === 0) {
        self.imagesObjectList = [];
        for (var i = 0; i < self.builtVehicles.length; i++) {
          var imageObject = { 'vehicleId': self.builtVehicles[i].vehicleId, 'vehiclephotos': self.builtVehicles[i].vehiclePhotos };
          self.imagesObjectList.push(imageObject);
        }
      }
      for (var j = 0; j < self.imagesObjectList.length; j++) {
        if (vehicleId === self.imagesObjectList[j].vehicleId) {
          self.images = self.imagesObjectList[j].vehiclephotos;
        }
      }
      $scope.selectedImageUrl = self.images[0];
      $scope.showcargalleryObj = {
        vehicleName: vehicleName,
        vehicleId: vehicleId,
        selectedImage: self.images,
        currentArticle: index,
        selectedImageUrl: $scope.selectedImageUrl
      };
      $modal.open({
        templateUrl: 'Angular/Commons/Template/showcargalleryContent.html',
        controller: 'showGalleryController',
        backdrop: 'static',
        animation: true,
        resolve: {
          showcargalleryObj: function () {
            return $scope.showcargalleryObj;
          }
        }
      });
    };

    /** Hot Spot**/
    $scope.showHotspotObj = {};
    self.viewHotspotAreaVehicle = function (index, vehicleId, vehicleName) {
      $scope.showHotspotObj = {
        vehicleName: vehicleName,
        currentArticle: index,
        vehicleIdHotspot: vehicleId,
        selectedHotspotVehicle: self.builtVehicles
      };
      $modal.open({
        templateUrl: 'Angular/Commons/Template/viewHotspotAreaVehicle.html',
        controller: 'showHotspotController',
        backdrop: 'true',
        animation: true,
        resolve: {
          showHotspotObj: function () {
            return $scope.showHotspotObj;
          }
        }
      });
    };

    /**** ReplaceVehicle *****/
    self.replaceVehicle = function (vehicleId) {
      //Change the legend visibility
      legendService.display.visible = false;

      //Get the index of the vehicle to be replaced
      dataSharingService.replaceVehicleIndex = cachedBuiltVehiclesIds.indexOf(vehicleId);

      //Remove the id from the cached built vehicles collection
      cachingBuiltVehicles.remove(vehicleId);

      //Set the is replacing benchmark vehicle
      dataSharingService.isReplacingBenchmark = self.builtVehicles && self.builtVehicles.length !== 0 && self.builtVehicles[0].vehicleId === vehicleId;

        //remove the entry from $rootScope.vehicleImages
      for (var i = 0; i < $rootScope.vehicleImages.length; i++){
          if ($rootScope.vehicleImages[i].id == vehicleId) {
              $rootScope.vehicleImages[i] = null;
          }
      }

      //Remove the vehicle from the server
      var cachedUserState = cachingService.getUserState();
      cachedUserState.toBeRemovedReplacedVehicleId = vehicleId;
      cachedUserState.isReplacingBenchmark = dataSharingService.isReplacingBenchmark;
      removeVehicleService.removeservices(cachedUserState)
        .then(function (result) {

          //Populate displayBuiltOptions
          commonFunctionService.buildOptionList = [];
          var displayBuiltOptions = result.data.displayBuiltOptions || [];
          displayBuiltOptions.forEach(function (displayBuiltOption) {
            (displayBuiltOption.primaryOptionInfos || []).forEach(function (primaryOptionInfo) {
              commonFunctionService.buildOptionList.push(primaryOptionInfo);
            });
          });

          resetCompareEquipIcon(cachedUserState);

          //Set the adding vehicles flag
          dataSharingService.isAddingVehicles = true;

          //Go to add vehicle starting step
          var step = selectionStepService.getStepById(startingSteps.addStartingStep.id);
          if (step) {
            $state.go(step.state);
          } else {
            $state.go('markets');
          }

          return;
        }, getOptionFailure);
    };

    /*** Remove Vehicles ***/
    self.removeVehicle = function (vehicleId, isBenchmark) {
      //Remove the id from the cached built vehicles collection
      cachingBuiltVehicles.remove(vehicleId);

      var cachedUserState = cachingService.getUserState();
      reloadBuildVehicles = true;
      cachedUserState.toBeRemovedReplacedVehicleId = vehicleId;

      if (isBenchmark && self.builtVehicles.length === 1) {
        dataSharingService.isReplacingBenchmark = true;
      }

      //remove the entry from $rootScope.vehicleImages
      for (var i = 0; i < $rootScope.vehicleImages.length; i++) {
          if ($rootScope.vehicleImages[i].id == vehicleId) {
              $rootScope.vehicleImages.splice(i,1);
          }
      }

      if (isBenchmark && self.builtVehicles.length > 1) {
        //Assign the next vehicle as benchmark
        cachedUserState.benchmarkId = self.builtVehicles[1].vehicleId;

        //Call the API
        benchMarkReplaceServices.removeAndReplaceBenchmark(cachedUserState)
          .then(getOptionSuccess, getOptionFailure)
          .finally(function () {
            reloadBuildVehicles = false;
            resetCompareEquipIcon(cachedUserState);
          });
      } else
        removeVehicleService.removeservices(cachedUserState)
          .then(getOptionSuccess, getOptionFailure)
          .finally(function () {
            reloadBuildVehicles = false;
            resetCompareEquipIcon(cachedUserState);
          });
    };


    /*** Add Compare Vehicles ***/
    self.addCompare = function (data) {
      // alert(JSON.stringify(data, null, 4));
      var index = cachingService.droppedVehicles.indexOf(data);
      if (index === -1) {
        cachingService.droppedVehicles.push(data);
        $scope.compareVehiclesAdd = true;
        $scope.$emit('droppedVehiclesAdd', $scope.compareVehiclesAdd, cachingService.droppedVehicles);
      }
    };
    self.compareVehiclesAdd = function (vehicleId) {
      var hide = false;
      for (var i = 0; i < cachingService.droppedVehicles.length; i++) {
        if (cachingService.droppedVehicles[i].vehicleId === vehicleId) {
          hide = true;
        }
      }
      return hide;
    };
    /*** Remove Compare Vehicles ***/
    self.removeCompareVehicle = function (vehicleId) {
      for (var i = 0; i < cachingService.droppedVehicles.length; i++) {
        if (cachingService.droppedVehicles[i].vehicleId === vehicleId) {
          //$scope.droppedVehicles.splice(i, 1);
          cachingService.droppedVehicles.splice(i, 1);
          break;
        }
      }
      if (cachingService.droppedVehicles.length < 1) {
        $scope.toggleComparisonVehicles();
        $scope.compareVehiclesAdd = false;
        $scope.$emit('droppedVehiclesAdd', $scope.compareVehiclesAdd, cachingService.droppedVehicles);
        cachingService.droppedVehicles = [];
        $state.go("Carspecs.Brochure");
      }
    };

    /**Build Option Filter**/
    self.checkbuildoptions = function (data, vehicleId) {
      if (data) {
        var filteredlist = data.filter(function (value) { return value.vehicleId === vehicleId; });
        return filteredlist.length;
      }
      return 0;
    };

    $rootScope.$on("CallUnbuildCompareEquip", function () {
      var cachedUserState = cachingService.getUserState();
      var vehicleId;
      if (!cachedUserState.isRemoveCompareEquip) {
        vehicleId = cachedUserState.masterCompareVehicleId;
        self.automaticBuild(vehicleId, true);
      }
    });

    /** Build compareEquip  & UnBuild compareEquip Function**/
    self.automaticBuild = function (vehicleId, type) {
      var dfd = $q.defer();

      self.spinnerLoading = true;
      self.activeCompareVehicleId = type === false ? vehicleId : 0;
      cachingService.set(null, 'activeCompareVehicleId', self.activeCompareVehicleId);
      self.autoBuildBenchmark = type;
      cachedUserState = cachingService.getUserState();
      cachedUserState.isRemoveCompareEquip = type;
      cachedUserState.isCompareEquip = true; //MM Added 01/07/2016
      cachedUserState.masterCompareVehicleId = vehicleId;
      compareEquipService.compareService(cachedUserState)
        .then(getOptionSuccess)
        .catch(function (error) {
          getOptionFailure();
          dfd.reject(error);
        })
        .finally(function () {
          self.spinnerLoading = false;

          cachedUserState.isCompareEquip = !cachedUserState.isRemoveCompareEquip;
          cachedUserState.masterCompareVehicleId = self.activeCompareVehicleId;
          dfd.resolve();
        });

      return dfd.promise;
    };

    /** Build Option & UnBuild Option Function**/
    self.requireBuildOption = function (unbuild, buildText, buildvehicleId, price, buildMarketName, unBuildOptionId) {
      self.spinnerLoading = true;

      //var optionsPromise = $q.when();
      //if (self.activeCompareVehicleId !== 0) {
      //  optionsPromise = self.automaticBuild(self.activeCompareVehicleId, true);
      //  //No need to call unbuild as automatic unbuild should remove them all
      //  if (unbuild) return;
      //}

      //optionsPromise.then(function () {
      $(".optionPopUpBgDisable").css("pointer-events", "");
      $('#myModal').modal('hide');
      self.builfOptonFormate = {};
      self.selectedOptions = [];
      self.selectedBuildValue = {};
      self.RequiredOptions = [];
      popupCategory = [];
      var marketDatabaseName;
      var buildVehicleId;
      var buildVehiclePrice;
      var optionId;
      var categoryHeading;
      var optionPrice;
      var x, y, z, primaryOption;
      $('.popupOptions input[type="radio"]:checked').each(function () {
        self.selectedOptions.push($(this).val());
      });

      buildVehicleId = $(".categoryHeadingName").attr("id");
      marketDatabaseName = $(".categoryHeadingName").attr("name");
      buildVehiclePrice = $(".categoryHeadingName").attr("value");
      optionId = $(".categoryHeadingName").attr("value1");
      if (price !== undefined) {
        buildVehiclePrice = price;
      }
      if (unbuild === false) {
        /** Optionprice Value **/
        optionPrice = $('.optionEditPrice').val();
        /*Auto Option Collapse*/
        categoryHeading = $(".categoryHeadingName").text().trim();
        x = categoryHeading.trim();
        y = x.indexOf('[');
        z = x.indexOf(']');
        primaryOption = x.substring(y, z + 1);
      } else {
        categoryHeading = buildText.trim();
        x = categoryHeading.trim();
        y = x.indexOf('[');
        z = x.indexOf(']');
        primaryOption = x.substring(y, (1 + z - y));
        buildVehicleId = buildvehicleId;
        marketDatabaseName = buildMarketName;
        optionId = unBuildOptionId;
      }

      if (self.selectedOptions.length < 1) {
        self.selectedBuildValue = { vehicleId: buildVehicleId, marketDatabaseName: marketDatabaseName, vehiclePrice: buildVehiclePrice, primaryOption: primaryOption, optionId: optionId, optionPrice: optionPrice, unbuild: unbuild };
      } else {
        self.selectedBuildValue = { vehicleId: buildVehicleId, marketDatabaseName: marketDatabaseName, vehiclePrice: buildVehiclePrice, primaryOption: primaryOption, requiredOptions: self.RequiredOptions, optionId: optionId, optionPrice: optionPrice, unbuild: unbuild };
      }
      var cachedUserState = cachingService.getUserState();

      //Set the cached activeCompareVehicleId
      // self.activeCompareVehicleId = 0;
      cachingService.set(null, 'activeCompareVehicleId', self.activeCompareVehicleId);
      cachedUserState.masterCompareVehicleId = self.activeCompareVehicleId;

      cachedUserState.selectedBuildValue = self.selectedBuildValue;
      cachedUserState.isOptionBuildFromBrochurePage = true;
      if (unbuild === true)
        cachedUserState.isOptionBuildFromBrochurePage = false;
      optionsBuildService.getOption(cachedUserState)
        .then(function (result) {
          getOptionSuccess({ data: result });
        })
        .catch(function (error) {
          toastr.error(error);
        })
        .finally(function () {
          self.spinnerLoading = false;
        });
      //});
    };

    /********** Options Success *******/
    function getOptionSuccess(result) {
      /*Categories auto collapse*/
      self.closeAllCategoriesOnOptionBuild();

      popupCategory = [];
      self.buildOptionList = [];

      var returnedUserState = result.data;

      if (!returnedUserState.builtVehicles || returnedUserState.builtVehicles.length < 1) {
        //Change the legend visibility
        legendService.display.visible = false;

        //Set the adding vehicles flag
        dataSharingService.isAddingVehicles = true;

        //Go to add vehicle starting step
        var step = selectionStepService.getStepById(startingSteps.addStartingStep.id);
        if (step) {
          $state.go(step.state);
        } else {
          $state.go('markets');
        }

        return;
      }

      // only run for remove and replace
      if (!!returnedUserState.builtVehicles && reloadBuildVehicles) {
        // reassign the sortOrder
        returnedUserState.builtVehicles.forEach(function (vehicle) {
          // find the vehicle
          var tempVehicle;
          self.builtVehicles.some(function (prevVehicle) {
            if (prevVehicle.vehicleId === vehicle.vehicleId) {
              tempVehicle = prevVehicle;
              return true;
            }

            return false;
          });

          if (!!tempVehicle) vehicle.sortOrder = tempVehicle.sortOrder;
        });
      }

      //Assign the built vehicles in the right order
      self.builtVehicles = getSortedBuiltVehicles(returnedUserState.builtVehicles || [], cachedBuiltVehiclesIds);

      //Set the vehicle column width
      setVehicleWidthStyle(self.builtVehicles.length);

      var vehicleDisplayBuiltOptions = returnedUserState.displayBuiltOptions || [];
      for (var h = 0; h < vehicleDisplayBuiltOptions.length; h++) {
        for (var i = 0; i < vehicleDisplayBuiltOptions[h].primaryOptionInfos.length; i++)
          self.buildOptionList.push(vehicleDisplayBuiltOptions[h].primaryOptionInfos[i]);
      }

      var vehicleOptionPrices = returnedUserState.vehicleOptionPrices || [];
      var vehiclePriceUpdated = returnedUserState.optionToBuildInfo || [];
      if (vehicleOptionPrices.length === 0) {
        self.builtVehicles.some(function (vehicle, index, array) {
          if (vehiclePriceUpdated.vehicleId === vehicle.vehicleId) {
            array[index].vehicleHeaderInfo.displayPrice = vehiclePriceUpdated.vehicleDisplayPrice;
            array[index].vehicleHeaderInfo.price = vehiclePriceUpdated.vehiclePrice;
            return true;
          }
          return false;
        });
      } else {
        vehicleOptionPrices.forEach(function (vehiclePrice) {
          var vehicleToUpdate;
          if (self.builtVehicles.some(function (vehicle) {
            vehicleToUpdate = vehicle;
            return vehiclePrice.vehicleId === vehicle.vehicleId;
          })) {
            if (vehiclePrice.vehicleDisplayPrice === "") {
              vehicleToUpdate.vehicleHeaderInfo.displayPrice = vehiclePrice.vehicleOriginalPrice;
            } else {
              vehicleToUpdate.vehicleHeaderInfo.displayPrice = vehiclePrice.vehicleDisplayPrice;
            }
          }
        });
      }
      buildVehicleNames(self.builtVehicles);
      buildVehicleOptions(self.builtVehicles);
      commonFunctionService.buildOptionList = self.buildOptionList;
      self.spinnerLoading = false;
      // show/hide compareEquip button
      self.showAutomaticBuild = self.builtVehicles.length > 1;
      // show/hide Key Advantages menu
      $scope.$emit('advantageVehicles', self.builtVehicles.length);
      var cachedState = cachingService.getUserState();
      cachedState.builtVehicles = self.builtVehicles;
    }

    function getOptionFailure() {
      /*Categories auto collapse*/
      self.closeAllCategoriesOnOptionBuild();
      self.spinnerLoading = false;
      alert('an error occurred!');
    }

    self.isCompareEquipeBuildEnable = function (vehicleId, index) {
      return brochureSettings.enableCompareEquip &&
        self.activeCompareVehicleId !== vehicleId &&
        ((!brochureSettings.compareEquipForAll && index === 0) ||
          brochureSettings.compareEquipForAll);
    };

    self.isCompareEquipeUnBuildEnable = function (vehicleId) {
      return brochureSettings.enableCompareEquip &&
        self.activeCompareVehicleId === vehicleId;
    };

    self.isQuoteEnabled = function () {
      return !!cachedUserState.defaultSetting && cachedUserState.defaultSetting.allowQuotes;
    };

    function saveJsonFile(data, filename) {
      if (!data) {
        console.error('No data');
        return;
      }

      if (!filename) {
        filename = 'download.json';
      }

      if (typeof data === 'object') {
        data = JSON.stringify(data, undefined, 2);
      }

      var blob = new Blob([data], { type: 'text/json' });

      // FOR IE:

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        var e = document.createEvent('MouseEvents');
        var a = document.createElement('a');

        a.download = filename;
        a.href = window.URL.createObjectURL(blob);
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
        e.initEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(e);
      }
    }
    self.addVehicleQuote = function (vehicle) {
      if (!vehicle) return;

      self.spinnerLoading = true;

      //prepare input
      var addQuoteInput = {
        databaseName: vehicle.vehicleHeaderInfo.specsDatabaseName,
        vehicleId: vehicle.vehicleId
      };

      return quoteManagerService.add(addQuoteInput)
        .then(function (quote) {
          if (!!quote && !!quote.id) {
            toastr.info("Quote successfully added. Quote id is: " + quote.id);
            if (cachedUserState.defaultSetting.quoteRedirectUrl && cachedUserState.defaultSetting.quoteRedirectUrl !== "") {
              window.open(cachedUserState.defaultSetting.quoteRedirectUrl + '?guid=' + cachedUserState.userGuid + '&id=' + quote.id, '_blank');
            } else {
              saveJsonFile(quote, "quote.json");
            }
          }
          else throw "quote couldn't be added. Try again!";
        })
        .catch(function (error) {
          toastr.error(error);
        })
        .finally(function () {
          self.spinnerLoading = false;
        });
    };

    $scope.$emit('currentPage', true, true, false);

    self.buildOptionHeight = function () {
      if (self.buildOptionList != null && self.buildOptionList.length > 0 && self.optionBuildOpen == true) {
        var returnedHeight = 0;
        for (var i = 0; i < self.builtVehicles.length; i++) {
          var height = jQuery("#vehicle" + i + " .buildOptionPanel .panel-collapse.collapse").height() + 37;
          if (height > returnedHeight)
            returnedHeight = height;
        }
        return returnedHeight + "px"
      }
      else { return "auto" }
    }
    self.refresh = function () {
      self.optionBuildOpen = !self.optionBuildOpen;
      setTimeout(function () {
        $scope.$apply(function () {
          //blank digest cycle call
        });
      }, 750);
    }

    self.equalizeVehicleHeaderHeights = function () {
      var timer = $timeout(function () {
        commonFunctionService.equalizeVehicleHeaderHeights(self.builtVehicles);
      }, 50);

      $scope.$on("$destroy", function (event) {
        $timeout.cancel(timer);
      });
    }

    init();

    self.highlightText = function (id) {
      var searchTerm = $('#text-search').val();

      // remove any old highlighted terms
      $('#vehicleoptions' + id).removeHighlight();

      // disable highlighting if empty
      if (searchTerm) {
        // highlight the new term
        $('#vehicleoptions' + id).highlight(searchTerm);
      }
    };

  }
  angular.module('JatoCarspecsApp').controller('brochureCtrl', brochureCtrl);

  brochureCtrl.$inject = [
    '$scope', '$state', '$filter', '$log', '$q', '$timeout',
    'brochureService', 'cachingService', 'CommonFunctionService', '$location', '$anchorScroll',
    '$rootScope', '$modal', 'selectionStepBackToService', 'optionsBuildService', 'removeVehicleService',
    'translationService', 'compareEquipService', 'benchMarkReplaceServices', 'shelfServices', '$stateParams',
    'startingStepsService', 'selectionStepService', 'legendService', 'dataSharingService', 'cachingBuiltVehicles', 'jatoNetServices', '$sce',
    'segmentsCacheService', 'quoteManagerService', 'wlcTitleLandingPageService', 'httpPathService'
  ];
}());