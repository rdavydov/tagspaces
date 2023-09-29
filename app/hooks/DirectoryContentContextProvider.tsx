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
  useState
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { locationType } from '@tagspaces/tagspaces-common/misc';
import {
  actions as AppActions,
  AppDispatch,
  getSelectedEntries,
  isSearchMode
} from '-/reducers/app';
import { TS } from '-/tagspaces.namespace';
import { useTranslation } from 'react-i18next';
import {
  extractParentDirectoryPath,
  getMetaFileLocationForDir,
  normalizePath
} from '@tagspaces/tagspaces-common/paths';
import PlatformIO from '-/services/platform-facade';
import { loadJSONFile, merge, updateFsEntries } from '-/services/utils-io';
import AppConfig from '-/AppConfig';
import { PerspectiveIDs } from '-/perspectives';
import { updateHistory } from '-/utils/dom';
import {
  getEnableWS,
  getShowUnixHiddenEntries,
  getUseGenerateThumbnails
} from '-/reducers/settings';
import { enhanceEntry, getUuid } from '@tagspaces/tagspaces-common/utils-io';
import {
  getThumbnailURLPromise,
  supportedContainers,
  supportedImgs,
  supportedMisc,
  supportedText,
  supportedVideos
} from '-/services/thumbsgenerator';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import GlobalSearch from '-/services/search-index';
import { Pro } from '-/pro';

type DirectoryContentContextData = {
  currentDirectoryEntries: TS.FileSystemEntry[];
  directoryMeta: TS.FileSystemEntryMeta;
  currentDirectoryPerspective: string;
  currentDirectoryPath: string;
  /**
   * used for reorder files in KanBan
   */
  currentDirectoryFiles: TS.OrderVisibilitySettings[];
  /**
   * used for reorder dirs in KanBan
   */
  currentDirectoryDirs: TS.OrderVisibilitySettings[];
  isMetaLoaded: boolean;
  loadParentDirectoryContent: () => void;
  loadDirectoryContent: (
    directoryPath: string,
    generateThumbnails: boolean,
    loadDirMeta?: boolean
  ) => void;
  enhanceDirectoryContent: (
    dirEntries,
    isCloudLocation,
    showDirs?: boolean,
    limit?: number
  ) => any;
  openCurrentDirectory: () => void;
  clearDirectoryContent: () => void;
  setCurrentDirectoryPerspective: (perspective: string) => void;
  setCurrentDirectoryColor: (color: string) => void;
  setCurrentDirectoryDirs: (dirs: TS.OrderVisibilitySettings[]) => void;
  setCurrentDirectoryFiles: (files: TS.OrderVisibilitySettings[]) => void;
  updateCurrentDirEntry: (path: string, entry: TS.FileSystemEntry) => void;
  updateCurrentDirEntries: (dirEntries: TS.FileSystemEntry[]) => void;
  updateThumbnailUrl: (filePath: string, thumbUrl: string) => void;
  setDirectoryMeta: (meta: TS.FileSystemEntryMeta) => void;
  watchForChanges: (location?: TS.Location) => void;
};

export const DirectoryContentContext = createContext<
  DirectoryContentContextData
>({
  currentDirectoryEntries: [],
  directoryMeta: undefined,
  currentDirectoryPerspective: PerspectiveIDs.GRID,
  currentDirectoryPath: undefined,
  currentDirectoryFiles: [],
  currentDirectoryDirs: [],
  isMetaLoaded: false,
  loadParentDirectoryContent: () => {},
  loadDirectoryContent: () => {},
  enhanceDirectoryContent: () => {},
  openCurrentDirectory: () => {},
  clearDirectoryContent: () => {},
  setCurrentDirectoryPerspective: () => {},
  setCurrentDirectoryColor: () => {},
  setCurrentDirectoryDirs: () => {},
  setCurrentDirectoryFiles: () => {},
  updateCurrentDirEntry: () => {},
  updateCurrentDirEntries: () => {},
  updateThumbnailUrl: () => {},
  setDirectoryMeta: () => {},
  watchForChanges: () => {}
});

export type DirectoryContentContextProviderProps = {
  children: React.ReactNode;
};

export const DirectoryContentContextProvider = ({
  children
}: DirectoryContentContextProviderProps) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const { closeAllLocations, currentLocation } = useCurrentLocationContext();
  const selectedEntries = useSelector(getSelectedEntries);
  const searchMode = useSelector(isSearchMode);
  const useGenerateThumbnails = useSelector(getUseGenerateThumbnails);
  const showUnixHiddenEntries = useSelector(getShowUnixHiddenEntries);
  const enableWS = useSelector(getEnableWS);
  //const defaultPerspective = useSelector(getDefaultPerspective);

  const [currentDirectoryEntries, setCurrentDirectoryEntries] = useState([]);
  const directoryMeta = useRef<TS.FileSystemEntryMeta>({ id: getUuid() });
  const isMetaLoaded = useRef<boolean>(false);
  const currentDirectoryPath = useRef<string>(undefined);
  const currentDirectoryPerspective = useRef<string>(
    PerspectiveIDs.UNSPECIFIED
  );
  const currentDirectoryFiles = useRef<TS.OrderVisibilitySettings[]>([]);
  const currentDirectoryDirs = useRef<TS.OrderVisibilitySettings[]>([]);

  useEffect(() => {
    if (currentLocation) {
      currentDirectoryPath.current = PlatformIO.getLocationPath(
        currentLocation
      );
      loadDirectoryContent(
        currentDirectoryPath.current,
        currentLocation.type !== locationType.TYPE_CLOUD,
        true
      );
      if (currentLocation.type !== locationType.TYPE_CLOUD) {
        watchForChanges(currentLocation);
      }
    } else {
      clearDirectoryContent();
      if (Pro && Pro.Watcher) {
        Pro.Watcher.stopWatching();
      }
    }
  }, [currentLocation]);

  function loadParentDirectoryContent() {
    const currentLocationPath = normalizePath(currentLocation.path);

    // dispatch(actions.setIsLoading(true));

    if (currentDirectoryPath.current) {
      const parentDirectory = extractParentDirectoryPath(
        currentDirectoryPath.current,
        PlatformIO.getDirSeparator()
      );
      // console.log('parentDirectory: ' + parentDirectory  + ' - currentLocationPath: ' + currentLocationPath);
      if (parentDirectory.includes(currentLocationPath)) {
        loadDirectoryContent(parentDirectory, false, true);
      } else {
        dispatch(
          AppActions.showNotification(
            t('core:parentDirNotInLocation'),
            'warning',
            true
          )
        );
        // dispatch(actions.setIsLoading(false));
      }
    } else {
      dispatch(
        AppActions.showNotification(t('core:firstOpenaFolder'), 'warning', true)
      );
      // dispatch(actions.setIsLoading(false));
    }
  }

  function updateCurrentDirEntry(path: string, entry: any) {
    if (searchMode) {
      const results = updateFsEntries(GlobalSearch.getInstance().getResults(), [
        { ...entry, path }
      ]);
      GlobalSearch.getInstance().setResults(results);
    } else {
      setCurrentDirectoryEntries(
        updateFsEntries(currentDirectoryEntries, [entry])
      );
    }
  }

  function updateCurrentDirEntries(dirEntries: TS.FileSystemEntry[]) {
    if (currentDirectoryEntries && currentDirectoryEntries.length > 0) {
      const newDirEntries = currentDirectoryEntries.map(currentEntry => {
        const updatedEntries = dirEntries.filter(
          newEntry => newEntry.path === currentEntry.path
        );
        if (updatedEntries && updatedEntries.length > 0) {
          const updatedEntry = updatedEntries.reduce(
            (prevValue, currentValue) =>
              merge(currentValue, prevValue) as TS.FileSystemEntry
          );
          return merge(updatedEntry, currentEntry);
        }
        return currentEntry;
      });

      setCurrentDirectoryEntries(newDirEntries);
    }
    setCurrentDirectoryEntries(dirEntries);
  }

  function updateThumbnailUrl(filePath: string, thumbUrl: string) {
    const dirEntries = currentDirectoryEntries.map(entry => {
      if (entry.path === filePath) {
        return { ...entry, thumbPath: thumbUrl };
      }
      return entry;
    });
    setCurrentDirectoryEntries(dirEntries);
  }

  function updateThumbnailUrls(directoryContent, tmbURLs: Array<any>) {
    const dirEntries = directoryContent.map(entry => {
      const tmbUrl = tmbURLs.find(tmbUrl => tmbUrl.filePath == entry.path);
      if (tmbUrl) {
        return { ...entry, thumbPath: tmbUrl };
      }
      return entry;
    });
    setCurrentDirectoryEntries(dirEntries);
  }

  function loadDirectoryContent(
    directoryPath: string,
    generateThumbnails: boolean,
    loadDirMeta = false
  ) {
    // console.debug('loadDirectoryContent:' + directoryPath);
    window.walkCanceled = false;
    currentDirectoryPath.current = directoryPath;

    // dispatch(actions.setIsLoading(true));

    if (selectedEntries.length > 0) {
      dispatch(AppActions.setSelectedEntries([]));
    }
    if (loadDirMeta) {
      try {
        const metaFilePath = getMetaFileLocationForDir(
          directoryPath,
          PlatformIO.getDirSeparator()
        );
        loadJSONFile(metaFilePath).then(fsEntryMeta =>
          loadDirectoryContentInt(
            generateThumbnails,
            fsEntryMeta
            // description: getDescriptionPreview(fsEntryMeta.description, 200)
          )
        );
      } catch (err) {
        console.debug('Error loading meta of:' + directoryPath + ' ' + err);
        loadDirectoryContentInt(generateThumbnails);
      }
    } else {
      loadDirectoryContentInt(generateThumbnails);
    }
  }

  function loadDirectoryContentInt(
    generateThumbnails: boolean,
    fsEntryMeta?: TS.FileSystemEntryMeta
  ) {
    dispatch(AppActions.showNotification(t('core:loading'), 'info', false));
    if (fsEntryMeta && fsEntryMeta.perspective) {
      currentDirectoryPerspective.current = fsEntryMeta.perspective;
    }
    const resultsLimit = {
      maxLoops:
        currentLocation && currentLocation.maxLoops
          ? currentLocation.maxLoops
          : AppConfig.maxLoops,
      IsTruncated: false
    };
    PlatformIO.listDirectoryPromise(
      currentDirectoryPath.current,
      fsEntryMeta &&
        fsEntryMeta.perspective &&
        (fsEntryMeta.perspective === PerspectiveIDs.KANBAN ||
          fsEntryMeta.perspective === PerspectiveIDs.GALLERY)
        ? ['extractThumbPath']
        : [], // mode,
      currentLocation ? currentLocation.ignorePatternPaths : [],
      resultsLimit
    )
      .then(results => {
        if (resultsLimit.IsTruncated) {
          //OPEN ISTRUNCATED dialog
          dispatch(AppActions.toggleTruncatedConfirmDialog());
        }
        updateHistory(currentLocation, currentDirectoryPath.current);
        if (results !== undefined) {
          // console.debug('app listDirectoryPromise resolved:' + results.length);
          prepareDirectoryContent(results, fsEntryMeta, generateThumbnails);
        }
        /*dispatch(
          AppActions.updateCurrentDirectoryPerspective(
            fsEntryMeta ? fsEntryMeta.perspective : undefined
          )
        );*/
        return true;
      })
      .catch(error => {
        // console.timeEnd('listDirectoryPromise');
        loadDirectoryFailure(error);
        /*dispatch(
          AppActions.updateCurrentDirectoryPerspective(
            fsEntryMeta ? fsEntryMeta.perspective : undefined
          )
        );*/
      });
  }

  function clearDirectoryContent() {
    currentDirectoryPath.current = undefined;
    setCurrentDirectoryEntries([]);
  }

  function openCurrentDirectory() {
    if (currentDirectoryPath.current) {
      loadDirectoryContent(currentDirectoryPath.current, false, true);
    } else {
      dispatch(AppActions.setSearchResults([]));
    }
  }

  function loadDirectoryFailure(error?: any) {
    console.error('Error loading directory: ', error);
    dispatch(AppActions.hideNotifications());

    dispatch(
      AppActions.showNotification(
        t('core:errorLoadingFolder') + ': ' + error.message,
        'warning',
        false
      )
    );
    closeAllLocations();
    // dispatch(actions.loadDirectorySuccess(directoryPath, []));
  }

  function prepareDirectoryContent(
    dirEntries,
    dirEntryMeta,
    generateThumbnails
  ) {
    const isCloudLocation = currentLocation.type === locationType.TYPE_CLOUD;

    const {
      directoryContent,
      tmbGenerationPromises,
      tmbGenerationList
    } = enhanceDirectoryContent(dirEntries, isCloudLocation, true, undefined);

    function handleTmbGenerationResults(results) {
      // console.log('tmb results' + JSON.stringify(results));
      const tmbURLs = [];
      results.map(tmbResult => {
        if (tmbResult.tmbPath && tmbResult.tmbPath.length > 0) {
          // dispatch(actions.updateThumbnailUrl(tmbResult.filePath, tmbResult.tmbPath));
          tmbURLs.push(tmbResult);
        }
        return true;
      });
      dispatch(AppActions.setGeneratingThumbnails(false));
      // dispatch(actions.hideNotifications());
      if (tmbURLs.length > 0) {
        updateThumbnailUrls(directoryContent, tmbURLs);
      }
      return true;
    }

    function handleTmbGenerationFailed(error) {
      console.warn('Thumb generation failed: ' + error);
      dispatch(AppActions.setGeneratingThumbnails(false));
      dispatch(
        AppActions.showNotification(
          'Generating thumbnails failed', //t('core:generatingThumbnailsFailed'),
          'warning',
          true
        )
      );
    }

    if (
      generateThumbnails &&
      (tmbGenerationList.length > 0 || tmbGenerationPromises.length > 0)
    ) {
      dispatch(AppActions.setGeneratingThumbnails(true));
      if (tmbGenerationList.length > 0) {
        PlatformIO.createThumbnailsInWorker(tmbGenerationList)
          .then(handleTmbGenerationResults)
          .catch(() => {
            // WS error handle
            Promise.all(
              tmbGenerationList.map(tmbPath => getThumbnailURLPromise(tmbPath))
            )
              .then(handleTmbGenerationResults)
              .catch(handleTmbGenerationFailed);
          });
      }
      if (tmbGenerationPromises.length > 0) {
        Promise.all(tmbGenerationPromises)
          .then(handleTmbGenerationResults)
          .catch(handleTmbGenerationFailed);
      }
    }

    console.log(
      'Dir ' +
        currentDirectoryPath.current +
        ' contains ' +
        directoryContent.length
    );
    loadDirectorySuccess(directoryContent, dirEntryMeta);
  }

  function loadDirectorySuccess(
    directoryContent: Array<any>,
    directoryMeta?: TS.FileSystemEntryMeta
  ) {
    dispatch(AppActions.hideNotifications(['error']));
    if (
      currentDirectoryPath.current &&
      currentDirectoryPath.current.startsWith('./')
    ) {
      // relative paths
      currentDirectoryPath.current = PlatformIO.resolveFilePath(
        currentDirectoryPath.current
      );
    }
    if (
      directoryMeta &&
      directoryMeta.customOrder &&
      directoryMeta.customOrder.files
    ) {
      currentDirectoryFiles.current = directoryMeta.customOrder.files;
    }
    if (
      directoryMeta &&
      directoryMeta.customOrder &&
      directoryMeta.customOrder.folders
    ) {
      currentDirectoryDirs.current = directoryMeta.customOrder.folders;
    }
    setCurrentDirectoryEntries(directoryContent);
    // isMetaLoaded.current = false;
    // dispatch(actions.setIsMetaLoaded(false));
  }

  function setCurrentDirectoryColor(color: string) {
    if (directoryMeta) {
      directoryMeta.current.color = color;
    }
  }

  function genThumbnails() {
    if (
      !currentDirectoryPath.current ||
      currentDirectoryPath.current.endsWith(
        AppConfig.dirSeparator + AppConfig.metaFolder
      ) ||
      currentDirectoryPath.current.endsWith(
        AppConfig.dirSeparator + AppConfig.metaFolder + AppConfig.dirSeparator
      )
    ) {
      return false; // dont generate thumbnails in meta folder
    }
    if (AppConfig.useGenerateThumbnails !== undefined) {
      return AppConfig.useGenerateThumbnails;
    }
    return useGenerateThumbnails;
  }

  function enhanceDirectoryContent(
    dirEntries,
    isCloudLocation,
    showDirs = true,
    limit = undefined
  ) {
    const directoryContent = [];
    const tmbGenerationPromises = [];
    const tmbGenerationList = [];
    const isWorkerAvailable = enableWS && PlatformIO.isWorkerAvailable();
    const supportedImgsWS = [
      'jpg',
      'jpeg',
      'jif',
      'jfif',
      'png',
      'gif',
      'svg',
      'tif',
      'tiff',
      'ico',
      'webp',
      'avif'
      // 'bmp' currently electron main processed: https://github.com/lovell/sharp/issues/806
    ];

    dirEntries.map(entry => {
      if (!showUnixHiddenEntries && entry.name.startsWith('.')) {
        return true;
      }

      if (!showDirs && !entry.isFile) {
        return true;
      }

      if (limit !== undefined && directoryContent.length >= limit) {
        return true;
      }

      const enhancedEntry: TS.FileSystemEntry = enhanceEntry(
        entry,
        AppConfig.tagDelimiter,
        PlatformIO.getDirSeparator()
      );
      directoryContent.push(enhancedEntry);
      if (
        // Enable thumb generation by
        !AppConfig.isWeb && // not in webdav mode
        !PlatformIO.haveObjectStoreSupport() && // not in object store mode
        !PlatformIO.haveWebDavSupport() && // not in webdav mode
        enhancedEntry.isFile && // only for files
        genThumbnails() // enabled in the settings
      ) {
        // const isPDF = enhancedEntry.path.endsWith('.pdf');
        if (
          isWorkerAvailable &&
          supportedImgsWS.includes(enhancedEntry.extension)
        ) {
          // !isPDF) {
          tmbGenerationList.push(enhancedEntry.path);
        } else if (
          supportedImgs.includes(enhancedEntry.extension) ||
          supportedContainers.includes(enhancedEntry.extension) ||
          supportedText.includes(enhancedEntry.extension) ||
          supportedMisc.includes(enhancedEntry.extension) ||
          supportedVideos.includes(enhancedEntry.extension)
        ) {
          tmbGenerationPromises.push(
            getThumbnailURLPromise(enhancedEntry.path)
          );
        } else {
          console.log(
            'Unsupported thumbgeneration ext:' + enhancedEntry.extension
          );
        }
      }
      return true;
    });

    return {
      directoryContent,
      tmbGenerationPromises,
      tmbGenerationList
    };
  }

  function setCurrentDirectoryPerspective(perspective: string) {
    currentDirectoryPerspective.current = perspective;
  }

  function setCurrentDirectoryDirs(dirs: TS.OrderVisibilitySettings[]) {
    currentDirectoryDirs.current = dirs;
  }

  function setCurrentDirectoryFiles(files: TS.OrderVisibilitySettings[]) {
    currentDirectoryFiles.current = files;
  }

  function setDirectoryMeta(meta: TS.FileSystemEntryMeta) {
    directoryMeta.current = meta;
  }

  function watchForChanges(location?: TS.Location) {
    if (location === undefined) {
      location = currentLocation;
    }
    if (Pro && Pro.Watcher && location && location.watchForChanges) {
      const depth =
        currentDirectoryPerspective.current === PerspectiveIDs.KANBAN ? 3 : 1;
      Pro.Watcher.watchFolder(
        PlatformIO.getLocationPath(location),
        dispatch,
        loadDirectoryContent,
        depth
      );
    }
  }

  const context = useMemo(() => {
    return {
      currentDirectoryEntries: currentDirectoryEntries,
      directoryMeta: directoryMeta.current,
      currentDirectoryPerspective: currentDirectoryPerspective.current,
      currentDirectoryPath: currentDirectoryPath.current,
      currentDirectoryFiles: currentDirectoryFiles.current,
      currentDirectoryDirs: currentDirectoryDirs.current,
      isMetaLoaded: isMetaLoaded.current,
      loadDirectoryContent,
      loadParentDirectoryContent,
      enhanceDirectoryContent,
      openCurrentDirectory,
      clearDirectoryContent,
      setCurrentDirectoryPerspective,
      setCurrentDirectoryColor,
      setCurrentDirectoryDirs,
      setCurrentDirectoryFiles,
      updateCurrentDirEntry,
      updateCurrentDirEntries,
      updateThumbnailUrl,
      setDirectoryMeta,
      watchForChanges
    };
  }, [
    currentLocation,
    currentDirectoryEntries,
    currentDirectoryPath.current,
    directoryMeta.current,
    currentDirectoryPerspective.current,
    currentDirectoryFiles.current,
    currentDirectoryDirs.current
  ]);

  return (
    <DirectoryContentContext.Provider value={context}>
      {children}
    </DirectoryContentContext.Provider>
  );
};
