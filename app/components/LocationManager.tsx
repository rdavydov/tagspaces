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

import React, { useEffect, useRef, useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import Button from '@material-ui/core/Button';
import styles from './SidePanels.css';
import LocationManagerMenu from './menus/LocationManagerMenu';
import ConfirmDialog from './dialogs/ConfirmDialog';
import SelectDirectoryDialog from './dialogs/SelectDirectoryDialog';
import CreateDirectoryDialog from './dialogs/CreateDirectoryDialog';
import CustomLogo from './CustomLogo';
import {
  actions as LocationActions,
  getLocations,
  Location
} from '../reducers/locations';
import { actions as AppActions } from '../reducers/app';
import { getPerspectives } from '-/reducers/settings';
import i18n from '../services/i18n';
import AppConfig from '../config';
import LoadingLazy from '-/components/LoadingLazy';
import LocationView from '-/components/LocationView';
import { Pro } from '-/pro';

const CreateEditLocationDialog = React.lazy(() =>
  import(
    /* webpackChunkName: "CreateEditLocationDialog" */ './dialogs/CreateEditLocationDialog'
  )
);
const CreateEditLocationDialogAsync = props => (
  <React.Suspense fallback={<LoadingLazy />}>
    <CreateEditLocationDialog {...props} />
  </React.Suspense>
);

interface Props {
  classes: any;
  style: any;
  locations: Array<Location>;
  perspectives: Array<Object>;
  hideDrawer: () => void;
  openURLExternally: (path: string) => void;
  openFileNatively: (path: string) => void;
  toggleOpenLinkDialog: () => void;
  setDefaultLocations: () => void;
  addLocation: (location: Location, openAfterCreate?: boolean) => void;
  importLocations: (locations: Array<Location>) => void;
  editLocation: () => void;
  removeLocation: (location: Location) => void;
}

type SubFolder = {
  uuid: string;
  name: string;
  path: string;
  children?: Array<SubFolder>;
};

const LocationManager = (props: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location>(null);
  const [selectedDirectoryPath, setSelectedDirectoryPath] = useState<string>(
    null
  );
  const [
    isCreateLocationDialogOpened,
    setCreateLocationDialogOpened
  ] = useState<boolean>(false);
  const [isEditLocationDialogOpened, setEditLocationDialogOpened] = useState<
    boolean
  >(false);
  const [
    isDeleteLocationDialogOpened,
    setDeleteLocationDialogOpened
  ] = useState<boolean>(false);
  const [
    isCreateDirectoryDialogOpened,
    setCreateDirectoryDialogOpened
  ] = useState<boolean>(false);
  const [
    isSelectDirectoryDialogOpened,
    setSelectDirectoryDialogOpened
  ] = useState<boolean>(false);

  useEffect(() => {
    if (props.locations.length < 1) {
      // init locations
      props.setDefaultLocations();
    }
  }, []); // props.locations]);

  const createNewDirectoryExt = (path: string) => {
    setCreateDirectoryDialogOpened(true);
    setSelectedDirectoryPath(path);
  };

  const showSelectDirectoryDialog = () => {
    setSelectDirectoryDialogOpened(true);
    setSelectedDirectoryPath('');
  };

  const chooseDirectoryPath = (currentPath: string) => {
    setSelectDirectoryDialogOpened(true);
    setSelectedDirectoryPath(currentPath);
  };

  function handleFileInputChange(selection: any) {
    const target = selection.currentTarget;
    const file = target.files[0];
    const reader: any = new FileReader();

    reader.onload = () => {
      try {
        const locations = Pro.LocationsExport.importLocations(reader.result);
        if (locations) {
          props.importLocations(locations);
        }
      } catch (e) {
        console.error('Error : ', e);
      }
    };
    reader.readAsText(file);
    target.value = null;
  }

  const { classes } = props;
  return (
    <div className={classes.panel} style={props.style}>
      <CustomLogo />

      <LocationManagerMenu
        importLocations={() => {
          if (AppConfig.isCordovaAndroid && AppConfig.isCordovaiOS) {
            // TODO Select directory or file from dialog
            showSelectDirectoryDialog();
          } else {
            fileInputRef.current.click();
          }
        }}
        exportLocations={() => {
          Pro.LocationsExport.exportLocations(props.locations);
        }}
        classes={classes}
        openURLExternally={props.openURLExternally}
        showCreateLocationDialog={() => {
          setCreateLocationDialogOpened(true);
        }}
        toggleOpenLinkDialog={props.toggleOpenLinkDialog}
      />
      {!AppConfig.locationsReadOnly && (
        <div
          style={{
            width: '100%',
            textAlign: 'center',
            marginBottom: 10
          }}
        >
          <Button
            data-tid="createNewLocation"
            onClick={() => setCreateLocationDialogOpened(true)}
            title={i18n.t('core:createLocationTitle')}
            className={classes.mainActionButton}
            size="small"
            variant="outlined"
            color="primary"
            style={{ width: '95%' }}
          >
            {/* <CreateLocationIcon className={classNames(classes.leftIcon)} /> */}
            {i18n.t('core:createLocationTitle')}
          </Button>
        </div>
      )}
      <div>
        {isCreateLocationDialogOpened && (
          <CreateEditLocationDialogAsync
            open={isCreateLocationDialogOpened}
            onClose={() => setCreateLocationDialogOpened(false)}
            addLocation={props.addLocation}
            showSelectDirectoryDialog={showSelectDirectoryDialog}
          />
        )}
        {isEditLocationDialogOpened && (
          <CreateEditLocationDialogAsync
            open={isEditLocationDialogOpened}
            onClose={() => setEditLocationDialogOpened(false)}
            location={selectedLocation}
            editLocation={props.editLocation}
            showSelectDirectoryDialog={showSelectDirectoryDialog}
          />
        )}
        {isDeleteLocationDialogOpened && (
          <ConfirmDialog
            open={isDeleteLocationDialogOpened}
            onClose={() => setDeleteLocationDialogOpened(false)}
            title={i18n.t('core:deleteLocationTitleAlert')}
            content={i18n.t('core:deleteLocationContentAlert', {
              locationName: selectedLocation ? selectedLocation.name : ''
            })}
            confirmCallback={result => {
              if (result && selectedLocation) {
                props.removeLocation(selectedLocation);
              }
            }}
            cancelDialogTID="cancelDeleteLocationDialog"
            confirmDialogTID="confirmDeleteLocationDialog"
          />
        )}
        {isSelectDirectoryDialogOpened && (
          <SelectDirectoryDialog
            open={isSelectDirectoryDialogOpened}
            onClose={() => setSelectDirectoryDialogOpened(false)}
            createNewDirectoryExt={createNewDirectoryExt}
            chooseDirectoryPath={chooseDirectoryPath}
          />
        )}
        {isCreateDirectoryDialogOpened && (
          <CreateDirectoryDialog
            open={isCreateDirectoryDialogOpened}
            onClose={() => setCreateDirectoryDialogOpened(false)}
            selectedDirectoryPath={selectedDirectoryPath}
          />
        )}
        <List
          className={classes.locationListArea}
          data-tid="locationList"
          style={{
            maxHeight: 'calc(100vh - 175px)',
            // @ts-ignore
            overflowY: AppConfig.isFirefox ? 'auto' : 'overlay'
          }}
        >
          {props.locations.map(location => (
            <LocationView
              key={location.uuid}
              classes={props.classes}
              location={location}
              hideDrawer={props.hideDrawer}
              setEditLocationDialogOpened={setEditLocationDialogOpened}
              setDeleteLocationDialogOpened={setDeleteLocationDialogOpened}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
            />
          ))}
        </List>
      </div>
      <input
        style={{ display: 'none' }}
        ref={fileInputRef}
        accept="*"
        type="file"
        onChange={handleFileInputChange}
      />
    </div>
  );
};

function mapStateToProps(state) {
  return {
    locations: getLocations(state),
    perspectives: getPerspectives(state)
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      setDefaultLocations: LocationActions.setDefaultLocations,
      addLocation: LocationActions.addLocation,
      importLocations: LocationActions.importLocations,
      editLocation: LocationActions.editLocation,
      removeLocation: LocationActions.removeLocation,
      openFileNatively: AppActions.openFileNatively,
      toggleOpenLinkDialog: AppActions.toggleOpenLinkDialog,
      openURLExternally: AppActions.openURLExternally
    },
    dispatch
  );
}

export default withStyles(styles)(
  // @ts-ignore
  connect(mapStateToProps, mapDispatchToProps)(LocationManager)
);
