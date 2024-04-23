/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2023-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '-/reducers/app';
import { useTranslation } from 'react-i18next';
import {
  actions as LocationActions,
  getDefaultLocationId,
  getLocations,
} from '-/reducers/locations';
import { clearAllURLParams, getURLParameter } from '-/utils/dom';
import { locationType } from '@tagspaces/tagspaces-common/misc';
import { getUuid } from '@tagspaces/tagspaces-common/utils-io';
import { useNotificationContext } from '-/hooks/useNotificationContext';
import { getPersistTagsInSidecarFile } from '-/reducers/settings';
import AppConfig from '../AppConfig';
import versionMeta from '-/version.json';
import { CommonLocation } from '-/utils/CommonLocation';

type CurrentLocationContextData = {
  currentLocation: CommonLocation;
  readOnlyMode: boolean;
  skipInitialDirList: boolean;
  persistTagsInSidecarFile: boolean;
  getLocationPath: (location: CommonLocation) => Promise<string>;
  findLocation: (locationID: string) => CommonLocation;
  changeLocation: (location: CommonLocation) => void;
  editLocation: (location: CommonLocation, openAfterEdit?: boolean) => void;
  addLocation: (
    location: CommonLocation,
    openAfterCreate?: boolean,
    locationPosition?: number,
  ) => void;
  addLocations: (
    arrLocations: Array<CommonLocation>,
    override?: boolean,
  ) => void;
  openLocation: (
    location: CommonLocation,
    skipInitialDirList?: boolean,
  ) => void;
  closeLocation: (locationId: string) => void;
  closeAllLocations: () => void;
  changeLocationByID: (locationId: string) => void;
  openLocationById: (locationId: string, skipInitialDirList?: boolean) => void;
  selectedLocation: CommonLocation;
  setSelectedLocation: (location: CommonLocation) => void;
  getLocationPosition: (locationId: string) => number;
  locationDirectoryContextMenuAnchorEl: null | HTMLElement;
  setLocationDirectoryContextMenuAnchorEl: (el: HTMLElement) => void;
};

export const CurrentLocationContext = createContext<CurrentLocationContextData>(
  {
    currentLocation: undefined,
    readOnlyMode: false,
    skipInitialDirList: false,
    persistTagsInSidecarFile: true,
    getLocationPath: undefined,
    findLocation: undefined,
    changeLocation: () => {},
    editLocation: () => {},
    addLocation: () => {},
    addLocations: () => {},
    openLocation: () => {},
    closeLocation: () => {},
    closeAllLocations: () => {},
    changeLocationByID: () => {},
    openLocationById: () => {},
    selectedLocation: undefined,
    setSelectedLocation: undefined,
    getLocationPosition: () => 0,
    locationDirectoryContextMenuAnchorEl: undefined,
    setLocationDirectoryContextMenuAnchorEl: () => {},
  },
);

export type CurrentLocationContextProviderProps = {
  children: React.ReactNode;
};

export const CurrentLocationContextProvider = ({
  children,
}: CurrentLocationContextProviderProps) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const { showNotification } = useNotificationContext();
  const [currentLocation, setCurrentLocation] =
    useState<CommonLocation>(undefined);
  const [selectedLocation, setSelectedLocation] =
    useState<CommonLocation>(undefined);
  const skipInitialDirList = useRef<boolean>(false);
  const [
    locationDirectoryContextMenuAnchorEl,
    setLocationDirectoryContextMenuAnchorEl,
  ] = useState<null | HTMLElement>(null);

  const locations: CommonLocation[] = useSelector(getLocations);
  const defaultLocationId = useSelector(getDefaultLocationId);
  const settingsPersistTagsInSidecarFile: boolean = useSelector(
    getPersistTagsInSidecarFile,
  );

  useEffect(() => {
    if (!currentLocation && defaultLocationId && defaultLocationId.length > 0) {
      const openDefaultLocation =
        !getURLParameter('tslid') &&
        !getURLParameter('tsdpath') &&
        !getURLParameter('tsepath') &&
        !getURLParameter('cmdopen');
      if (openDefaultLocation) {
        openLocationById(defaultLocationId);
      }
    }
  }, []);

  useEffect(() => {
    if (locations.length < 1) {
      // init locations
      setDefaultLocations();
    } else {
      // check if current location exist (or is removed)
      if (currentLocation) {
        const location = locations.find(
          (location) => location.uuid === currentLocation.uuid,
        );
        if (!location) {
          closeLocation(currentLocation.uuid);
        }
      }
    }
  }, [locations]);

  function getLocationPath(location: CommonLocation): Promise<string> {
    let locationPath = '';
    if (location) {
      if (location.path) {
        locationPath = location.path;
      }
      if (location.paths && location.paths[0]) {
        // eslint-disable-next-line prefer-destructuring
        locationPath = location.paths[0];
      }

      if (
        locationPath &&
        (locationPath.startsWith('.' + AppConfig.dirSeparator) ||
          locationPath.startsWith('./')) && // location paths are not with platform dirSeparator
        AppConfig.isElectron
      ) {
        // TODO test relative path (Directory Back) with other platforms
        // relative paths
        return window.electronIO.ipcRenderer.invoke(
          'resolveRelativePaths',
          locationPath,
        );
      }
    }

    return Promise.resolve(locationPath);
  }

  function findLocation(locationID: string): CommonLocation {
    return locations.find((l) => l.uuid === locationID);
  }

  function setDefaultLocations() {
    currentLocation
      .getDevicePaths()
      .then((devicePaths) => {
        if (devicePaths) {
          Object.keys(devicePaths).forEach((key) => {
            const location = new CommonLocation({
              uuid: getUuid(),
              type: locationType.TYPE_LOCAL,
              name: t(('core:' + key) as any) as string,
              path: devicePaths[key] as string,
              isDefault: false, // AppConfig.isWeb && devicePaths[key] === '/files/', // Used for the web ts demo
              isReadOnly: false,
              disableIndexing: false,
            });
            addLocation(location, false);
          });
        }
        return true;
      })
      .catch((ex) => console.log(ex));
  }

  function addLocation(
    location: CommonLocation,
    openAfterCreate = true,
    locationPosition: number = undefined,
  ) {
    dispatch(LocationActions.createLocation(location, locationPosition));
    if (openAfterCreate) {
      openLocation(location);
    }
  }
  /**
   * @param arrLocations
   * @param override = true - if location exist override else skip
   */
  function addLocations(arrLocations: Array<CommonLocation>, override = true) {
    arrLocations.forEach((newLocation: CommonLocation, idx, array) => {
      const locationExist: boolean = locations.some(
        (location) => location.uuid === newLocation.uuid,
      );
      const isLast = idx === array.length - 1;
      if (!locationExist) {
        addLocation(newLocation, isLast);
      } else if (override) {
        editLocation(newLocation, isLast);
      }
    });
  }

  function editLocation(location: CommonLocation, openAfterEdit = true) {
    dispatch(LocationActions.changeLocation(location));
    setCurrentLocation(location);
    if (openAfterEdit) {
      /*
       * check if location uuid is changed
       */
      if (
        location.newuuid !== undefined &&
        location.newuuid !== location.uuid
      ) {
        openLocation({ ...location, uuid: location.newuuid });
      } else {
        openLocation(location);
      }
      // dispatch(AppActions.setReadOnlyMode(location.isReadOnly || false));
    }
  }

  const readOnlyMode: boolean = useMemo(
    () => currentLocation && currentLocation.isReadOnly,
    [currentLocation],
  );

  const persistTagsInSidecarFile: boolean = useMemo(() => {
    const locationPersistTagsInSidecarFile =
      currentLocation && currentLocation.persistTagsInSidecarFile;
    if (locationPersistTagsInSidecarFile !== undefined) {
      return locationPersistTagsInSidecarFile;
    }
    return settingsPersistTagsInSidecarFile;
  }, [currentLocation, settingsPersistTagsInSidecarFile]);

  function changeLocation(location: CommonLocation) {
    if (!currentLocation || location.uuid !== currentLocation.uuid) {
      if (location && location.name) {
        document.title = location.name + ' | ' + versionMeta.name;
      }
      setCurrentLocation(location);
    }
  }

  function changeLocationByID(locationId: string) {
    if (!currentLocation || locationId !== currentLocation.uuid) {
      const location = locations.find(
        (location) => location.uuid === locationId,
      );
      if (location) {
        setCurrentLocation(location);
      }
    }
  }

  /*function switchLocationTypeByID(locationId: string) {
    const location = locations.find((location) => location.uuid === locationId);
    return setLocationType(location);
    //return switchLocationType(location);
  }*/

  /**
   * @param location
   * return Promise<currentLocationId> if location is changed or null if location and type is changed
   */
  /*function switchLocationType(location: TS.Location) {
    if (location !== undefined) {
      if (currentLocation === undefined) {
        return setLocationType(location).then(() => null);
      }
      if (location.uuid !== currentLocation.uuid) {
        if (location.type !== currentLocation.type) {
          return setLocationType(location).then(() => null);
        } else {
          // handle the same location type but different location
          return setLocationType(location).then(() => currentLocation.uuid);
        }
      }
    }
    return Promise.resolve(null);
  }*/

  /*function switchCurrentLocationType() {
    return setLocationType(currentLocation);
  }*/

  function openLocationById(locationId: string, skipInitDirList?: boolean) {
    const location = locations.find((location) => location.uuid === locationId);
    if (location) {
      openLocation(location, skipInitDirList);
    }
  }

  function openLocation(
    location: CommonLocation,
    skipInitDirList: boolean = false,
  ) {
    skipInitialDirList.current = skipInitDirList;
    if (location.type === locationType.TYPE_CLOUD) {
      showNotification(
        t('core:connectedtoObjectStore' as any) as string,
        'default',
        true,
      );
    }
    changeLocation(location);
  }

  function closeLocation(locationId: string) {
    if (currentLocation && currentLocation.uuid === locationId) {
      locations.map((location) => {
        if (location.uuid === locationId) {
          // location needed evtl. to unwatch many loc. root folders if available
          setCurrentLocation(undefined);
        }
        clearAllURLParams();
        document.title = versionMeta.name;
        return true;
      });
    }
  }

  function closeAllLocations() {
    // location needed evtl. to unwatch many loc. root folders if available
    setCurrentLocation(undefined);
    clearAllURLParams();
    document.title = versionMeta.name;
    return true;
  }

  function getLocationPosition(locationId: string): number {
    return locations.findIndex((location) => location.uuid === locationId);
  }

  function isCurrentLocation(uuid: string) {
    return currentLocation && currentLocation.uuid === uuid;
  }

  const context = useMemo(() => {
    return {
      currentLocation,
      readOnlyMode,
      skipInitialDirList: skipInitialDirList.current,
      persistTagsInSidecarFile,
      getLocationPath,
      findLocation,
      changeLocation,
      addLocation,
      addLocations,
      editLocation,
      openLocation,
      closeLocation,
      closeAllLocations,
      changeLocationByID,
      openLocationById,
      selectedLocation,
      setSelectedLocation,
      locationDirectoryContextMenuAnchorEl,
      setLocationDirectoryContextMenuAnchorEl,
      getLocationPosition,
    };
  }, [
    currentLocation,
    selectedLocation,
    persistTagsInSidecarFile,
    skipInitialDirList.current,
    locationDirectoryContextMenuAnchorEl,
  ]);

  return (
    <CurrentLocationContext.Provider value={context}>
      {children}
    </CurrentLocationContext.Provider>
  );
};
