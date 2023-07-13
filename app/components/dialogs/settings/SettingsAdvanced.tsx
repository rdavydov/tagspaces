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

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import withStyles from '@mui/styles/withStyles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '-/components/Tooltip';
import Button from '@mui/material/Button';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import MenuItem from '@mui/material/MenuItem';
import AppConfig from '-/AppConfig';
import i18n from '-/services/i18n';
import {
  actions as SettingsActions,
  getSettings,
  getMapTileServers,
  isDevMode
} from '-/reducers/settings';
import { TS } from '-/tagspaces.namespace';
import MapTileServerDialog from '-/components/dialogs/settings/MapTileServerDialog';
import { Pro } from '-/pro';
import { ProLabel } from '-/components/HelperComponents';
import InfoIcon from '-/components/InfoIcon';
import { DeleteIcon } from '-/components/CommonIcons';
import { ListItemIcon } from '@mui/material';
import ConfirmDialog from '-/components/dialogs/ConfirmDialog';
import { AppDispatch } from '-/reducers/app';

const styles: any = {
  root: {
    overflowX: 'hidden'
  },
  listItem: {
    paddingLeft: 0,
    paddingRight: 0
  },
  pro: {
    backgroundColor: '#1DD19F'
  },
  colorChooserButton: {
    minHeight: 30,
    border: '1px solid lightgray'
  }
};

interface Props {
  classes: any;
  showResetSettings: (showDialog: boolean) => void;
}

const historyKeys = Pro && Pro.history ? Pro.history.historyKeys : {};

function SettingsAdvanced(props: Props) {
  const { classes, showResetSettings } = props;
  const dispatch: AppDispatch = useDispatch();
  const settings = useSelector(getSettings);
  const tileServers: Array<TS.MapTileServer> = useSelector(getMapTileServers);
  //const enableWS = useSelector(getEnableWS);
  const devMode = useSelector(isDevMode);
  const [tileServerDialog, setTileServerDialog] = useState<any>(undefined);
  const [confirmDialogKey, setConfirmDialogKey] = useState<null | string>(null);

  const handleEditTileServerClick = (event, tileServer, isDefault: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setTileServerDialog({ ...tileServer, isDefault });
  };

  const geoTaggingFormatDisabled = AppConfig.geoTaggingFormat !== undefined;

  const setDesktopMode = desktopMode =>
    dispatch(SettingsActions.setDesktopMode(desktopMode));

  const setDevMode = devMode => dispatch(SettingsActions.setDevMode(devMode));

  const setEnableWS = enableWS =>
    dispatch(SettingsActions.setEnableWS(enableWS));

  const setWarningOpeningFilesExternally = warningOpeningFilesExternally =>
    dispatch(
      SettingsActions.setWarningOpeningFilesExternally(
        warningOpeningFilesExternally
      )
    );

  const setSaveTagInLocation = saveTagInLocation =>
    dispatch(SettingsActions.setSaveTagInLocation(saveTagInLocation));

  const setRevisionsEnabled = enabled =>
    dispatch(SettingsActions.setRevisionsEnabled(enabled));

  const setGeoTaggingFormat = geoTaggingFormat =>
    dispatch(SettingsActions.setGeoTaggingFormat(geoTaggingFormat));

  const setHistory = (key, value) =>
    dispatch(SettingsActions.setHistory(key, value));

  const setPrefixTagContainer = prefix =>
    dispatch(SettingsActions.setPrefixTagContainer(prefix));

  return (
    <div style={{ width: '100%' }}>
      <List className={classes.root}>
        <ListItem className={classes.listItem}>
          <Button
            data-tid="resetSettingsTID"
            onClick={() => showResetSettings(true)}
            color="secondary"
            style={{ marginLeft: -7 }}
          >
            {i18n.t('core:resetSettings')}
          </Button>
          <Button
            data-tid="reloadAppTID"
            onClick={() => {
              window.location.reload();
            }}
            color="secondary"
          >
            {i18n.t('core:reloadApplication')}
          </Button>
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('enableMobileMode')} />
          <Switch
            data-tid="settingsSetDesktopMode"
            disabled={!(typeof window.ExtDisplayMode === 'undefined')}
            onClick={() => setDesktopMode(!settings.desktopMode)}
            checked={!settings.desktopMode}
          />
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('enableDevMode')} />
          <Switch
            data-tid="settingsEnableDevMode"
            disabled={window.ExtDevMode && window.ExtDevMode === true}
            onClick={() => setDevMode(!devMode)}
            checked={devMode}
          />
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('enableWS')} />
          <Switch
            data-tid="settingsEnableWS"
            onClick={() => setEnableWS(!settings.enableWS)}
            checked={settings.enableWS}
          />
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('warningOpeningFilesExternally')} />
          <Switch
            data-tid="warningOpeningFilesExternally"
            onClick={() =>
              setWarningOpeningFilesExternally(
                !settings.warningOpeningFilesExternally
              )
            }
            checked={settings.warningOpeningFilesExternally}
          />
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('core:prefixTagContainer')} />
          <Input
            style={{ maxWidth: '100px' }}
            data-tid="prefixTagContainerTID"
            value={settings.prefixTagContainer}
            onChange={event => setPrefixTagContainer(event.target.value)}
          />
        </ListItem>
        {Pro && (
          <>
            <ListItem className={classes.listItem}>
              <ListItemText primary={i18n.t('core:fileOpenHistory')} />
              <ListItemIcon>
                <Tooltip title={i18n.t('clearHistory')}>
                  <IconButton
                    aria-label={i18n.t('core:clearHistory')}
                    onClick={() => setConfirmDialogKey(historyKeys.fileOpenKey)}
                    data-tid="clearSearchTID"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
              <Select
                data-tid="fileOpenTID"
                title={i18n.t('core:fileOpenHistoryTitle')}
                value={settings[historyKeys.fileOpenKey]}
                onChange={event =>
                  setHistory(historyKeys.fileOpenKey, event.target.value)
                }
                input={<Input id="fileOpenSelector" />}
              >
                <MenuItem value={0}>{i18n.t('core:disabled')}</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </ListItem>
            <ListItem className={classes.listItem}>
              <ListItemText primary={i18n.t('core:folderOpenHistory')} />
              <ListItemIcon>
                <Tooltip title={i18n.t('clearHistory')}>
                  <IconButton
                    aria-label={i18n.t('core:clearHistory')}
                    onClick={() =>
                      setConfirmDialogKey(historyKeys.folderOpenKey)
                    }
                    data-tid="clearSearchTID"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
              <Select
                data-tid="folderOpenTID"
                title={i18n.t('core:folderOpenHistoryTitle')}
                value={settings[historyKeys.folderOpenKey]}
                onChange={(event: any) =>
                  setHistory(historyKeys.folderOpenKey, event.target.value)
                }
                input={<Input id="folderOpenSelector" />}
              >
                <MenuItem value={0}>{i18n.t('core:disabled')}</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </ListItem>
            <ListItem className={classes.listItem}>
              <ListItemText primary={i18n.t('core:fileEditHistory')} />
              <ListItemIcon>
                <Tooltip title={i18n.t('clearHistory')}>
                  <IconButton
                    aria-label={i18n.t('core:clearHistory')}
                    onClick={() => setConfirmDialogKey(historyKeys.fileEditKey)}
                    data-tid="clearSearchTID"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
              <Select
                data-tid="fileEditTID"
                title={i18n.t('core:fileEditHistoryTitle')}
                value={settings[historyKeys.fileEditKey]}
                onChange={(event: any) =>
                  setHistory(historyKeys.fileEditKey, event.target.value)
                }
                input={<Input id="fileEditSelector" />}
              >
                <MenuItem value={0}>{i18n.t('core:disabled')}</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </ListItem>
            <ListItem className={classes.listItem}>
              <ListItemText primary={i18n.t('core:searchHistory')} />
              <ListItemIcon>
                <Tooltip title={i18n.t('clearHistory')}>
                  <IconButton
                    aria-label={i18n.t('core:clearHistory')}
                    onClick={() =>
                      setConfirmDialogKey(historyKeys.searchHistoryKey)
                    }
                    data-tid="clearSearchTID"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
              <Select
                data-tid="searchHistoryTID"
                title={i18n.t('core:searchHistoryTitle')}
                value={settings[historyKeys.searchHistoryKey]}
                onChange={(event: any) =>
                  setHistory(historyKeys.searchHistoryKey, event.target.value)
                }
                input={<Input id="searchHistorySelector" />}
              >
                <MenuItem value={0}>{i18n.t('core:disabled')}</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </ListItem>
            <ConfirmDialog
              open={confirmDialogKey !== null}
              onClose={() => {
                setConfirmDialogKey(null);
              }}
              title="Confirm"
              content={i18n.t('core:confirm' + confirmDialogKey + 'Deletion')}
              confirmCallback={result => {
                if (result) {
                  Pro.history.delAllHistory(confirmDialogKey);
                }
              }}
              cancelDialogTID={'cancelDelete' + confirmDialogKey + 'Dialog'}
              confirmDialogTID={'confirmDelete' + confirmDialogKey + 'Dialog'}
              confirmDialogContentTID={
                'confirmDelete' + confirmDialogKey + 'DialogContent'
              }
            />
          </>
        )}
        <ListItem className={classes.listItem}>
          <ListItemText
            primary={
              <>
                {i18n.t('setRevisionsEnabled')}
                <InfoIcon tooltip={i18n.t('core:setRevisionsEnabledHelp')} />
                <ProLabel />
              </>
            }
          />
          <Switch
            data-tid="setRevisionsEnabledTID"
            disabled={!Pro}
            onClick={() => setRevisionsEnabled(!settings.isRevisionsEnabled)}
            checked={settings.isRevisionsEnabled}
          />
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText
            primary={
              <>
                {i18n.t('enableTagsFromLocation')}
                <InfoIcon tooltip={i18n.t('core:enableTagsFromLocationHelp')} />
                <ProLabel />
              </>
            }
          />
          <Switch
            data-tid="saveTagInLocationTID"
            disabled={!Pro}
            onClick={() => setSaveTagInLocation(!settings.saveTagInLocation)}
            checked={settings.saveTagInLocation}
          />
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('core:geoTaggingFormat')} />
          <Select
            disabled={geoTaggingFormatDisabled}
            data-tid="geoTaggingFormatTID"
            title={
              geoTaggingFormatDisabled
                ? i18n.t('core:settingExternallyConfigured')
                : ''
            }
            value={
              geoTaggingFormatDisabled
                ? AppConfig.geoTaggingFormat
                : settings.geoTaggingFormat
            }
            onChange={(event: any) => setGeoTaggingFormat(event.target.value)}
            input={<Input id="geoTaggingFormatSelector" />}
          >
            {settings.supportedGeoTagging.map(geoTagging => (
              <MenuItem key={geoTagging} value={geoTagging}>
                {geoTagging.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </ListItem>
        <ListItem className={classes.listItem}>
          <ListItemText primary={i18n.t('core:tileServerTitle')} />
          <ListItemSecondaryAction style={{ right: 0 }}>
            <Button
              color="primary"
              onClick={event => handleEditTileServerClick(event, {}, true)}
            >
              {i18n.t('tileServerDialogAdd')}
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
        <List
          style={{
            padding: 5,
            paddingLeft: 10,
            backgroundColor: '#d3d3d34a',
            borderRadius: 10
          }}
          dense
        >
          {tileServers.length > 0 ? (
            tileServers.map((tileServer, index) => (
              <ListItem key={tileServer.uuid} className={classes.listItem}>
                <ListItemText
                  primary={tileServer.name}
                  secondary={tileServer.serverURL}
                  style={{ maxWidth: 470 }}
                />
                <ListItemSecondaryAction>
                  {index === 0 && (
                    <Tooltip title={i18n.t('core:serverIsDefaultHelp')}>
                      <CheckIcon
                        data-tid="tileServerDefaultIndication"
                        style={{ marginLeft: 10 }}
                      />
                    </Tooltip>
                  )}
                  <IconButton
                    aria-label={i18n.t('core:options')}
                    aria-haspopup="true"
                    edge="end"
                    data-tid={'tileServerEdit_' + tileServer.name}
                    onClick={event =>
                      handleEditTileServerClick(event, tileServer, index === 0)
                    }
                    size="large"
                  >
                    <EditIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          ) : (
            <ListItem key="noTileServers" className={classes.listItem}>
              <ListItemText
                primary={i18n.t('core:noTileServersTitle')}
                secondary={i18n.t('core:addTileServersHelp')}
              />
            </ListItem>
          )}
        </List>
      </List>
      {tileServerDialog && (
        <MapTileServerDialog
          open={tileServerDialog !== undefined}
          onClose={() => setTileServerDialog(undefined)}
          tileServer={tileServerDialog}
          isDefault={tileServerDialog.isDefault}
        />
      )}
    </div>
  );
}

export default withStyles(styles, { withTheme: true })(SettingsAdvanced);
