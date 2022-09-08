/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
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

import React, { useReducer, useRef, useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';
import styles from './SidePanels.css';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/ExitToApp';
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import Typography from '@mui/material/Typography';
import AppConfig from '@tagspaces/tagspaces-platforms/AppConfig';
import {
  actions as LocationIndexActions,
  getSearchQuery
} from '-/reducers/location-index';
import {
  getCurrentLanguage,
  getShowUnixHiddenEntries
} from '-/reducers/settings';
import i18n from '../services/i18n';
import { Pro } from '../pro';
import { actions as SearchActions, getSearches } from '-/reducers/searches';
import { TS } from '-/tagspaces.namespace';
import SearchMenu from '-/components/menus/SearchMenu';
import { actions as AppActions, getCurrentLocationId } from '-/reducers/app';
import {
  delAllHistory,
  delHistory,
  getHistory,
  historyKeys
} from '../../extensions/tagspacespro/modules/history';
import { getAllPropertiesPromise } from '-/services/utils-io';
import { Tooltip } from '@mui/material';
import {
  extractFileName,
  extractDirectoryName
} from '@tagspaces/tagspaces-platforms/paths';
import PlatformIO from '-/services/platform-facade';
import HistoryMenu from '-/components/menus/HistoryMenu';

interface Props {
  style?: any;
  classes?: any;
  searchQuery: TS.SearchQuery;
  setSearchQuery: (searchQuery: TS.SearchQuery) => void;
  searches: Array<TS.SearchQuery>;
  // searchLocationIndex: (searchQuery: TS.SearchQuery) => void;
  // searchAllLocations: (searchQuery: TS.SearchQuery) => void;
  showUnixHiddenEntries: boolean;
  addSearches: (searches: Array<TS.SearchQuery>) => void;
  openURLExternally: (url: string) => void;
  reduceHeightBy: number;
  openFsEntry: (fsEntry: TS.FileSystemEntry) => void;
  openLink: (url: string, options: any) => void;
  openLocationById: (locationId: string) => void;
  currentLocationId: string;
}

const SaveSearchDialog = Pro && Pro.UI ? Pro.UI.SaveSearchDialog : false;

function StoredSearches(props: Props) {
  const [saveSearchDialogOpened, setSaveSearchDialogOpened] = useState<
    TS.SearchQuery
  >(undefined);
  const [storedSearchesVisible, setStoredSearchesVisible] = useState<boolean>(
    true
  );
  const [fileOpenHistory, setFileOpenHistory] = useState<boolean>(true);
  const [folderOpenHistory, setFolderOpenHistory] = useState<boolean>(true);
  const [fileEditHistory, setFileEditHistory] = useState<boolean>(true);
  const [
    searchMenuAnchorEl,
    setSearchMenuAnchorEl
  ] = useState<null | HTMLElement>(null);
  const [
    historyMenuAnchorEl,
    setHistoryMenuAnchorEl
  ] = useState<null | HTMLElement>(null);

  const [
    isExportSearchesDialogOpened,
    setExportSearchesDialogOpened
  ] = useState<boolean>(false);

  const [importFile, setImportFile] = useState<File>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuHistoryKey = useRef<string>(undefined);
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  const ExportSearchesDialog =
    Pro && Pro.UI ? Pro.UI.ExportSearchesDialog : false;
  const ImportSearchesDialog =
    Pro && Pro.UI ? Pro.UI.ImportSearchesDialog : false;

  const handleSearchMenu = (event: any) => {
    setSearchMenuAnchorEl(event.currentTarget);
  };

  const handleCloseSearchMenu = () => {
    setSearchMenuAnchorEl(null);
  };

  const editSearch = (uuid: string) => {
    const savedSearch = props.searches.find(search => search.uuid === uuid);
    if (!savedSearch) {
      return true;
    }
    setSaveSearchDialogOpened(savedSearch);
  };

  const handleSavedSearchClick = (uuid: string) => {
    const savedSearch = props.searches.find(search => search.uuid === uuid);
    if (!savedSearch) {
      return true;
    }

    props.setSearchQuery({
      ...savedSearch,
      showUnixHiddenEntries: props.showUnixHiddenEntries
    });

    /* if (savedSearch.searchBoxing === 'global') {
      props.searchAllLocations({
        ...savedSearch,
        showUnixHiddenEntries: props.showUnixHiddenEntries
      });
    } else {
      props.searchLocationIndex({
        ...savedSearch,
        showUnixHiddenEntries: props.showUnixHiddenEntries
      });
    } */
  };

  function handleFileInputChange(selection: any) {
    const target = selection.currentTarget;
    const file = target.files[0];
    setImportFile(file);
    target.value = null;
  }

  const preventDefault = (event: React.SyntheticEvent) =>
    event.preventDefault();

  const noSearchesFound = props.searches.length < 1;

  const { reduceHeightBy, classes } = props;

  const fileOpenHistoryItems: Array<TS.HistoryItem> = getHistory(
    historyKeys.fileOpenKey
  );
  const fileEditHistoryItems: Array<TS.HistoryItem> = getHistory(
    historyKeys.fileEditKey
  );
  const folderOpenHistoryItems: Array<TS.HistoryItem> = getHistory(
    historyKeys.folderOpenKey
  );

  const renderHistory = (historyKey, items: Array<TS.HistoryItem>) => (
    <Grid container direction="row">
      {items &&
        items.map(history => (
          <React.Fragment key={history.creationTimeStamp}>
            <Grid item xs={10} style={{ display: 'flex' }}>
              <Button
                style={{
                  textTransform: 'none',
                  fontWeight: 'normal',
                  width: '240px',
                  justifyContent: 'start',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
                onClick={() => {
                  if (history.url) {
                    props.openLink(history.url, { fullWidth: false });
                  } else {
                    PlatformIO.disableObjectStoreSupport();
                    if (history.lid !== props.currentLocationId) {
                      props.openLocationById(history.lid);
                    }
                    getAllPropertiesPromise(history.path)
                      .then((fsEntry: TS.FileSystemEntry) => {
                        props.openFsEntry(fsEntry);
                        return true;
                      })
                      .catch(error =>
                        console.warn(
                          'Error getting properties for entry: ' +
                            history.path +
                            ' - ' +
                            error
                        )
                      );
                  }
                }}
              >
                <Tooltip
                  arrow
                  title={
                    <span style={{ fontSize: 14 }}>
                      <b>Path:</b> {history.path}
                      <br />
                      <b>Opened on: </b>{' '}
                      {new Date(history.creationTimeStamp)
                        .toISOString()
                        .substring(0, 19)
                        .split('T')
                        .join(' ')}
                    </span>
                  }
                >
                  <HistoryIcon fontSize="small" />
                </Tooltip>
                &nbsp;
                {history.path.endsWith(PlatformIO.getDirSeparator())
                  ? extractDirectoryName(
                      history.path,
                      PlatformIO.getDirSeparator()
                    )
                  : extractFileName(history.path, PlatformIO.getDirSeparator())}
              </Button>
            </Grid>
            <Grid item xs={2} style={{ display: 'flex' }}>
              <IconButton
                aria-label={i18n.t('core:searchEditBtn')}
                onClick={() => {
                  delHistory(historyKey, history.creationTimeStamp);
                  forceUpdate();
                }}
                data-tid="editSearchTID"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </React.Fragment>
        ))}
    </Grid>
  );

  return (
    <div
      className={classes.panel}
      style={{
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className={classes.toolbar}>
        <Typography
          className={classNames(classes.panelTitle, classes.header)}
          variant="subtitle1"
          style={{ paddingLeft: 14 }}
        >
          {i18n.t('core:quickAccess')}
        </Typography>
      </div>
      <div
        style={{
          paddingTop: 0,
          marginTop: 0,
          height: 'calc(100% - ' + reduceHeightBy + 'px)',
          // @ts-ignore
          overflowY: AppConfig.isFirefox ? 'auto' : 'overlay'
        }}
      >
        <Grid container direction="row">
          <Grid item xs={10} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={() => setStoredSearchesVisible(!storedSearchesVisible)}
              size="large"
            >
              {storedSearchesVisible ? <ArrowDownIcon /> : <ArrowRightIcon />}
            </IconButton>
            <Typography
              variant="inherit"
              // className={props.classes.header}
              style={{ display: 'inline' }}
              noWrap
              onClick={() => setStoredSearchesVisible(!storedSearchesVisible)}
            >
              {i18n.t('core:savedSearchesTitle')}
            </Typography>
          </Grid>
          <Grid item xs={2} style={{ alignSelf: 'center' }}>
            <SearchMenu
              anchorEl={searchMenuAnchorEl}
              open={Boolean(searchMenuAnchorEl)}
              onClose={handleCloseSearchMenu}
              openURLExternally={props.openURLExternally}
              exportSearches={() => {
                setExportSearchesDialogOpened(true);
              }}
              importSearches={() => {
                fileInputRef.current.click();
              }}
            />
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={handleSearchMenu}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          </Grid>
        </Grid>
        <Grid container direction="row">
          {storedSearchesVisible && noSearchesFound && (
            <Grid item xs={12} style={{ display: 'flex', padding: 10 }}>
              {i18n.t('noSavedSearches')}
            </Grid>
          )}
        </Grid>
        <Grid container direction="row">
          {storedSearchesVisible &&
            props.searches.map(search => (
              <React.Fragment key={search.uuid}>
                <Grid item xs={10} style={{ display: 'flex' }}>
                  <Button
                    style={{
                      textTransform: 'none',
                      fontWeight: 'normal',
                      width: '100%',
                      justifyContent: 'start'
                    }}
                    onClick={() => handleSavedSearchClick(search.uuid)}
                  >
                    <SearchIcon />
                    &nbsp;
                    {search.title}
                  </Button>
                </Grid>
                <Grid item xs={2} style={{ display: 'flex' }}>
                  <IconButton
                    aria-label={i18n.t('core:searchEditBtn')}
                    onClick={() => editSearch(search.uuid)}
                    data-tid="editSearchTID"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </Grid>
              </React.Fragment>
            ))}
        </Grid>
        <Grid container direction="row">
          <Grid item xs={10} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={() => setFileOpenHistory(!fileOpenHistory)}
              size="large"
            >
              {fileOpenHistory ? <ArrowDownIcon /> : <ArrowRightIcon />}
            </IconButton>
            <Typography
              variant="inherit"
              style={{ display: 'inline' }}
              noWrap
              onClick={() => setFileOpenHistory(!fileOpenHistory)}
            >
              {i18n.t('core:fileOpenHistory')}
            </Typography>
          </Grid>
          <Grid item xs={2} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={(event: any) => {
                menuHistoryKey.current = historyKeys.fileOpenKey;
                setHistoryMenuAnchorEl(event.currentTarget);
              }}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          </Grid>
        </Grid>
        {fileOpenHistory &&
          renderHistory(historyKeys.fileOpenKey, fileOpenHistoryItems)}
        <Grid container direction="row">
          <Grid item xs={10} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={() => setFileEditHistory(!fileEditHistory)}
              size="large"
            >
              {fileEditHistory ? <ArrowDownIcon /> : <ArrowRightIcon />}
            </IconButton>
            <Typography
              variant="inherit"
              // className={props.classes.header}
              style={{ display: 'inline' }}
              noWrap
              onClick={() => setFileEditHistory(!fileEditHistory)}
            >
              {i18n.t('core:fileEditHistory')}
            </Typography>
          </Grid>
          <Grid item xs={2} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={(event: any) => {
                menuHistoryKey.current = historyKeys.fileEditKey;
                setHistoryMenuAnchorEl(event.currentTarget);
              }}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          </Grid>
        </Grid>
        {fileEditHistory &&
          renderHistory(historyKeys.fileEditKey, fileEditHistoryItems)}
        <Grid container direction="row">
          <Grid item xs={10} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={() => setFolderOpenHistory(!folderOpenHistory)}
              size="large"
            >
              {folderOpenHistory ? <ArrowDownIcon /> : <ArrowRightIcon />}
            </IconButton>
            <Typography
              variant="inherit"
              style={{ display: 'inline' }}
              noWrap
              onClick={() => setFolderOpenHistory(!folderOpenHistory)}
            >
              {i18n.t('core:folderOpenHistory')}
            </Typography>
          </Grid>
          <Grid item xs={2} style={{ alignSelf: 'center' }}>
            <IconButton
              style={{ minWidth: 'auto', padding: 7 }}
              onClick={(event: any) => {
                menuHistoryKey.current = historyKeys.folderOpenKey;
                setHistoryMenuAnchorEl(event.currentTarget);
              }}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          </Grid>
        </Grid>
        <HistoryMenu
          anchorEl={historyMenuAnchorEl}
          open={Boolean(historyMenuAnchorEl)}
          onClose={() => setHistoryMenuAnchorEl(null)}
          refreshHistory={() => forceUpdate()}
          clearAll={() => {
            delAllHistory(menuHistoryKey.current); //historyKeys.fileOpenKey);
            forceUpdate();
          }}
        />
        {folderOpenHistory &&
          renderHistory(historyKeys.folderOpenKey, folderOpenHistoryItems)}
        {SaveSearchDialog && saveSearchDialogOpened !== undefined && (
          <SaveSearchDialog
            open={true}
            onClose={(searchQuery: TS.SearchQuery) => {
              setSaveSearchDialogOpened(undefined);
              if (searchQuery) {
                props.setSearchQuery({
                  ...searchQuery,
                  showUnixHiddenEntries: props.showUnixHiddenEntries
                });

                /* if (searchQuery.searchBoxing === 'global') {
                props.searchAllLocations({
                  ...searchQuery,
                  showUnixHiddenEntries: props.showUnixHiddenEntries
                });
              } else {
                props.searchLocationIndex({
                  ...searchQuery,
                  showUnixHiddenEntries: props.showUnixHiddenEntries
                });
              } */
              }
            }}
            onClearSearch={() => console.log('search deleted')}
            searchQuery={saveSearchDialogOpened}
          />
        )}
        <div style={{ height: 40 }} />
      </div>
      <input
        style={{ display: 'none' }}
        ref={fileInputRef}
        accept="*"
        type="file"
        onChange={handleFileInputChange}
      />
      {ExportSearchesDialog && isExportSearchesDialogOpened && (
        <ExportSearchesDialog
          open={isExportSearchesDialogOpened}
          onClose={() => setExportSearchesDialogOpened(false)}
          searches={props.searches}
        />
      )}
      {ImportSearchesDialog && importFile && (
        <ImportSearchesDialog
          open={Boolean(importFile)}
          onClose={() => setImportFile(undefined)}
          importFile={importFile}
          addSearches={props.addSearches}
          searches={props.searches}
        />
      )}
    </div>
  );
}

function mapStateToProps(state) {
  return {
    language: getCurrentLanguage(state),
    searchQuery: getSearchQuery(state),
    searches: getSearches(state),
    showUnixHiddenEntries: getShowUnixHiddenEntries(state),
    currentLocationId: getCurrentLocationId(state)
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addSearches: SearchActions.addSearches,
      setSearchQuery: LocationIndexActions.setSearchQuery,
      // searchAllLocations: LocationIndexActions.searchAllLocations,
      // searchLocationIndex: LocationIndexActions.searchLocationIndex,
      openURLExternally: AppActions.openURLExternally,
      openFsEntry: AppActions.openFsEntry,
      openLink: AppActions.openLink,
      openLocationById: AppActions.openLocationById
    },
    dispatch
  );
}

const areEqual = (prevProp, nextProp) =>
  nextProp.language === prevProp.language &&
  nextProp.indexing === prevProp.indexing &&
  nextProp.searchQuery === prevProp.searchQuery &&
  nextProp.currentDirectory === prevProp.currentDirectory &&
  nextProp.indexedEntriesCount === prevProp.indexedEntriesCount &&
  JSON.stringify(nextProp.searches) === JSON.stringify(prevProp.searches) &&
  JSON.stringify(nextProp.classes) === JSON.stringify(prevProp.classes);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(React.memo(withStyles(styles)(StoredSearches), areEqual));
