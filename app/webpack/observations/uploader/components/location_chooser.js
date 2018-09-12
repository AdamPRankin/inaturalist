import _ from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { Modal, Button, Glyphicon, OverlayTrigger, Popover } from "react-bootstrap";
import SelectionBasedComponent from "./selection_based_component";
import LocationChooserMap from "./location_chooser_map";
import SavedLocationChooser from "./saved_location_chooser";
import util from "../models/util";

class LocationChooser extends SelectionBasedComponent {

  constructor( props, context ) {
    super( props, context );
    this.close = this.close.bind( this );
    this.save = this.save.bind( this );
    this.update = this.update.bind( this );
    this.multiValued = this.multiValued.bind( this );
    this.placeholder = this.placeholder.bind( this );
  }

  componentDidUpdate( prevProps ) {
    if ( this.props.show && !prevProps.show ) {
      // focus on the autocomplete search field when the location modal opens
      setTimeout( () => $( ".gm-style input" ).focus( ).val( "" ), 200 );
    }
  }

  close( ) {
    this.props.updateState( { locationChooser: { show: false } } );
  }

  save( ) {
    const attrs = {
      latitude: this.props.lat ? Number( this.props.lat ) : undefined,
      longitude: this.props.lat ? Number( this.props.lng ) : undefined,
      accuracy: this.props.radius ? Number( this.props.radius ) : undefined,
      center: this.props.center,
      bounds: this.props.bounds,
      zoom: this.props.zoom,
      locality_notes: this.props.notes,
      manualPlaceGuess: this.props.manualPlaceGuess
    };
    if ( !attrs.accuracy ) { attrs.accuracy = undefined; }
    if ( this.props.obsCard ) {
      if ( this.props.updateSingleObsCard ) {
        this.props.updateObsCard( attrs );
      } else {
        this.props.updateObsCard( this.props.obsCard, attrs );
      }
    } else {
      if ( !attrs.latitude && this.multiValued( "latitude" ) ) { delete attrs.latitude; }
      if ( !attrs.longitude && this.multiValued( "longitude" ) ) { delete attrs.longitude; }
      if ( !attrs.accuracy && this.multiValued( "accuracy" ) ) { delete attrs.accuracy; }
      if ( !attrs.locality_notes && this.multiValued( "locality_notes" ) ) {
        delete attrs.locality_notes;
      }
      this.props.updateSelectedObsCards( attrs );
    }
    this.close( );
  }

  update( field, e ) {
    const updates = { [field]: e.target.value };
    if ( field === "lat" || field === "lng" ) {
      let lat = updates.lat || this.props.lat;
      lat = lat ? Number( lat ) : undefined;
      let lng = updates.lng || this.props.lng;
      lng = lng ? Number( lng ) : undefined;
      if ( lat && Math.abs( lat ) > 90 ) { lat = undefined; }
      if ( lng && Math.abs( lng ) > 180 ) { lng = undefined; }
      if ( lat && lng ) { this.reverseGeocode( lat, lng ); }
    } else if ( field === "notes" ) {
      updates.manualPlaceGuess = true;
    }
    this.props.updateState( { locationChooser: updates } );
  }

  multiValued( prop ) {
    if ( this.props.obsCard ) { return false; }
    return this.props.selectedObsCards &&
           this.valuesOf( prop, this.props.selectedObsCards ).length > 1;
  }

  placeholder( prop ) {
    return this.multiValued( prop ) ? I18n.t( "multiple" ) : undefined;
  }

  reverseGeocode( lat, lng ) {
    if ( this.props.manualPlaceGuess && this.props.notes ) { return; }
    util.reverseGeocode( lat, lng ).then( location => {
      if ( location ) {
        this.props.updateState( { locationChooser: {
          notes: location,
          manualPlaceGuess: false
        } } );
      }
    } );
  }


  render() {
    let canSave = false;
    const latNum = Number( this.props.lat );
    const lngNum = Number( this.props.lng );
    if ( this.props.lat &&
         this.props.lng &&
         !_.isNaN( latNum ) &&
         !_.isNaN( lngNum ) &&
         _.inRange( latNum, -89.999, 90 ) &&
         _.inRange( lngNum, -179.999, 180 ) ) {
      canSave = true;
    } else if ( !this.props.lat && !this.props.lng ) {
      canSave = true;
    }
    const glyph = this.props.notes && ( <Glyphicon glyph="map-marker" /> );
    return (
      <Modal
        show={ this.props.show }
        className="location"
        onHide={ this.close }
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            { glyph }
            { this.props.notes || I18n.t( "location" ) }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <LocationChooserMap
            { ...this.props }
            containerElement={ <div className="map" /> }
            mapElement={ <div style={{ height: "100%" }} /> }
          />
          <div className="form">
            <div className="form-group">
              <label className="control-label">
                { I18n.t( "latitude" ) }
                <input
                  className="form-control"
                  key="lat"
                  type="text"
                  value={ this.props.lat || "" }
                  placeholder={ this.placeholder( "latitude" ) }
                  onChange={ e => this.update( "lat", e ) }
                />
              </label>
            </div>
            <div className="form-group">
              <label className="control-label">
                { I18n.t( "longitude" ) }
                <input
                  className="form-control"
                  key="lng"
                  type="text"
                  value={ this.props.lng || "" }
                  placeholder={ this.placeholder( "longitude" ) }
                  onChange={ e => this.update( "lng", e ) }
                />
              </label>
            </div>
            <div className="form-group">
              <label className="control-label" title={ I18n.t( "accuracy_meters" ) }>
                { I18n.t( "acc" ) }
                <input
                  className="form-control"
                  key="radius"
                  type="text"
                  value={ this.props.radius || "" }
                  placeholder={ this.placeholder( "accuracy" ) }
                  onChange={ e => this.update( "radius", e ) }
                />
              </label>
            </div>
            <div className="form-group notes-form-group">
              <label className="control-label">
                { I18n.t( "locality_notes" ) }
                <input
                  className="notes form-control"
                  key="notes"
                  type="text"
                  value={ this.props.notes || "" }
                  placeholder={ this.placeholder( "locality_notes" ) }
                  onChange={ e => this.update( "notes", e ) }
                />
              </label>
            </div>
            <div className="form-group save-form-group">
              <label className="control-label">
                &nbsp;
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={ () => {
                    this.props.saveLocation( {
                      latitude: latNum,
                      longitude: lngNum,
                      positional_accuracy: this.props.radius,
                      title: this.props.notes
                    } );
                  } }
                >
                  <i className="glyphicon glyphicon-map-marker"></i> { I18n.t( "save" ) }
                </button>
              </label>
            </div>
            <SavedLocationChooser
              className={ this.props.savedLocations.savedLocations.length === 0 ? "hidden" : "" }
              locationsTotal={ this.props.savedLocations.total }
              defaultLocations={ this.props.savedLocations.savedLocations }
              onChoose={ sl => {
                this.props.updateState( { locationChooser: {
                  lat: sl.latitude,
                  lng: sl.longitude,
                  radius: sl.positional_accuracy,
                  notes: sl.title,
                  manualPlaceGuess: false,
                  center: {
                    lat: sl.latitude,
                    lng: sl.longitude
                  },
                  show: true
                } } );
              } }
              removeLocation={ sl => this.props.removeSavedLocation( sl ) }
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={ this.close }>{ I18n.t( "cancel" ) }</Button>
          <Button
            onClick={ this.save }
            bsStyle="primary"
            disabled={ !canSave }
          >
            { I18n.t( "update_observations" ) }
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

LocationChooser.propTypes = {
  show: PropTypes.bool,
  manualPlaceGuess: PropTypes.bool,
  obsCard: PropTypes.object,
  obsCards: PropTypes.object,
  setState: PropTypes.func,
  selectedObsCards: PropTypes.object,
  updateState: PropTypes.func,
  updateObsCard: PropTypes.func,
  updateSelectedObsCards: PropTypes.func,
  updateSingleObsCard: PropTypes.bool,
  lat: PropTypes.any,
  lng: PropTypes.any,
  radius: PropTypes.any,
  zoom: PropTypes.number,
  center: PropTypes.object,
  bounds: PropTypes.object,
  notes: PropTypes.string,
  saveLocation: PropTypes.func,
  savedLocations: PropTypes.object,
  removeSavedLocation: PropTypes.func
};

LocationChooser.defaultProps = {
  savedLocations: {}
};

export default LocationChooser;
