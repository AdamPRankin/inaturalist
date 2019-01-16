import React from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import querystring from "querystring";
import {
  Modal,
  Button,
  ButtonGroup
} from "react-bootstrap";
import _ from "lodash";
import { fetch } from "../../../shared/util";
import ExternalPhoto from "./external_photo";
import ChosenPhoto from "./chosen_photo";
import PhotoChooserDropArea from "./photo_chooser_drop_area";

class PhotoChooserModal extends React.Component {
  constructor( props ) {
    super( props );
    this.movePhoto = this.movePhoto.bind( this );
    this.state = {
      photos: [],
      loading: true,
      submitting: false,
      provider: "inat",
      chosen: [],
      page: 1
    };
  }

  componentWillMount( ) {
    const { chosen } = this.props;
    if ( chosen ) {
      this.setState( { chosen } );
    }
  }

  componentWillReceiveProps( newProps ) {
    const { visible } = this.props;
    if ( !visible && newProps.visible ) {
      this.setState( { submitting: false } );
      this.fetchPhotos( newProps );
    }
    if ( newProps.chosen ) {
      this.setState( {
        chosen: newProps.chosen.map(
          p => Object.assign( {}, p, { chooserID: this.keyForPhoto( p ) } )
        )
      } );
    }
    if ( newProps.initialQuery ) {
      this.setState( { query: newProps.initialQuery } );
    }
  }

  setProvider( provider ) {
    this.setState( { provider } );
    this.fetchPhotos( this.props, { provider } );
  }

  fetchPhotos( props, options = {} ) {
    const { provider, query } = this.state;
    this.setState( { loading: true } );
    const chosenProvider = options.provider || provider || "inat";
    const params = Object.assign( { }, options, {
      q: query,
      limit: 24,
      page: options.page || 1
    } );
    this.setState( { page: params.page, photos: [] } );
    let url;
    switch ( chosenProvider ) {
      case "inat":
        url = `/taxa/observation_photos.json?${querystring.stringify( params )}`;
        break;
      case "inat-rg": {
        const rgParams = Object.assign( {}, params, { quality_grade: "research" } );
        url = `/taxa/observation_photos.json?${querystring.stringify( rgParams )}`;
        break;
      }
      default:
        url = `/${chosenProvider}/photo_fields.json?${querystring.stringify( params )}`;
    }
    fetch( url, params )
      .then(
        response => response.json( ),
        error => {
          // TODO handle error better
          this.setState( { loading: false } );
          console.log( "[DEBUG] error: ", error );
        }
      )
      .then( json => {
        const photos = json.map( p => Object.assign( {}, p, {
          chooserID: this.keyForPhoto( p )
        } ) );
        this.setState( {
          loading: false,
          photos: _.uniqBy( photos, photo => photo.chooserID )
        } );
      } );
  }

  fetchNextPhotos( ) {
    this.fetchPhotos( this.props, { page: this.state.page + 1 } );
  }

  fetchPrevPhotos( ) {
    this.fetchPhotos( this.props, {
      page: Math.max( this.state.page - 1, 1 )
    } );
  }

  movePhoto( dragIndex, hoverIndex ) {
    const { chosen } = this.state;
    const dragPhoto = chosen[dragIndex];
    if ( !dragPhoto ) {
      return;
    }
    if ( dragIndex === hoverIndex ) {
      return;
    }
    this.setState( update( this.state, {
      chosen: {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, dragPhoto]
        ]
      }
    } ) );
  }

  choosePhoto( chooserID ) {
    const { photos, chosen } = this.state;
    const existingIndex = chosen.findIndex( p => p.chooserID === chooserID );
    if ( existingIndex >= 0 ) {
      this.setState( {
        chosen: chosen.map( p => Object.assign( { }, p, { candidate: false } ) )
      } );
      return;
    }
    const photo = _.find( photos, p => p.chooserID === chooserID );
    if ( !photo ) {
      return;
    }
    photo.candidate = false;
    chosen.push( photo );
    this.setState( { chosen } );
  }

  newPhotoEnter( chooserID, index ) {
    const { photos, chosen } = this.state;
    const hovering = _.find( photos, p => p.chooserID === chooserID );
    if ( !hovering ) {
      return;
    }
    const existing = _.find( chosen, p => p.chooserID === chooserID );
    if ( existing ) {
      return;
    }
    const newPhoto = Object.assign( { }, hovering, { candidate: true } );
    chosen.splice( index, 0, newPhoto );
    this.setState( { chosen } );
  }

  newPhotoExit( ) {
    const { chosen } = this.state;
    this.setState( { chosen: chosen.filter( p => !p.candidate ) } );
  }

  removePhoto( chooserID ) {
    const { chosen } = this.state;
    this.setState( { chosen: chosen.filter( p => p.chooserID !== chooserID ) } );
  }

  keyForPhoto( photo ) {
    return `${photo.type || "Photo"}-${photo.id || photo.native_photo_id}`;
  }

  infoURL( photo ) {
    return photo.id ? `/photos/${photo.id}` : photo.native_page_url;
  }

  submit( ) {
    this.setState( { submitting: true } );
    this.props.onSubmit( this.state.chosen );
  }

  render( ) {
    const { visible, onClose } = this.props;
    const {
      provider,
      query,
      page,
      photos,
      loading,
      chosen,
      submitting
    } = this.state;
    let searchPlaceholder = I18n.t( "type_species_name" );
    if ( provider === "inat" ) {
      searchPlaceholder = I18n.t( "search_by_taxon_name_or_observation_id" );
    } else if ( provider === "flickr" ) {
      searchPlaceholder = I18n.t( "search_by_taxon_name_or_flickr_photo_id" );
    }
    const prevNextButtons = (
      <ButtonGroup className="pull-right">
        <Button
          disabled={page === 1}
          onClick={( ) => this.fetchPrevPhotos( )}
          title={I18n.t( "prev" )}
        >
          { I18n.t( "prev" ) }
        </Button>
        <Button
          onClick={( ) => this.fetchNextPhotos( )}
          title={I18n.t( "next" )}
        >
          { I18n.t( "next" ) }
        </Button>
      </ButtonGroup>
    );
    return (
      <Modal
        show={visible}
        bsSize="large"
        className="PhotoChooserModal FullScreenModal"
        onHide={onClose}
      >
        <div className="inner">
          <Modal.Header closeButton>
            <Modal.Title>{ I18n.t( "choose_photos_for_this_taxon" ) }</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="photocols">
              <div className="choosercol">
                <form
                  onSubmit={e => {
                    e.preventDefault( );
                    this.fetchPhotos( );
                    return false;
                  }}
                >
                  <div className="input-group search-control">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={searchPlaceholder}
                      value={query}
                      onChange={e => this.setState( { query: e.target.value } )}
                    />
                    <span className="input-group-btn">
                      <button
                        className="btn btn-default"
                        type="submit"
                      >
                        { I18n.t( "search" ) }
                      </button>
                    </span>
                  </div>
                </form>
                <form className="form-inline controls nav-buttons stacked">
                  <div className="form-group">
                    <label>
                      { I18n.t( "photos_from" ) }
                    </label>
                    { " " }
                    <select
                      className="form-control"
                      onChange={e => this.setProvider( e.target.value )}
                    >
                      <option value="inat">{ I18n.t( "observations" ) }</option>
                      <option value="inat-rg">{ I18n.t( "rg_observations" ) }</option>
                      <option value="flickr">Flickr</option>
                      <option value="eol">EOL</option>
                      <option value="wikimedia_commons">Wikimedia Commons</option>
                    </select>
                  </div>
                  { prevNextButtons }
                </form>
                <div className="photos">
                  { photos.map( photo => (
                    <ExternalPhoto
                      key={this.keyForPhoto( photo )}
                      chooserID={this.keyForPhoto( photo )}
                      src={photo.small_url}
                      movePhoto={this.movePhoto}
                      didNotDropPhoto={( ) => this.newPhotoExit( )}
                      infoURL={this.infoURL( photo )}
                    />
                  ) ) }
                  { loading ? (
                    <div className="loading text-center">
                      <i className="fa fa-spin fa-refresh fa-2x text-muted" />
                    </div>
                  ) : null }
                  { !loading && photos.length === 0 && page === 1 ? (
                    <div className="text-muted text-center">{ I18n.t( "no_results_found" ) }</div>
                  ) : null }
                  { !loading && photos.length === 0 && page > 1 ? (
                    <div className="text-muted text-center">{ I18n.t( "no_more_results_found" ) }</div>
                  ) : null }
                </div>
                { photos.length > 0 && <form>{ prevNextButtons }</form> }
              </div>
              <PhotoChooserDropArea
                photos={chosen}
                droppedPhoto={chooserID => this.choosePhoto( chooserID )}
              >
                <h4>{ I18n.t( "photos_chosen_for_this_taxon" ) }</h4>
                <p>
                  { I18n.t( "views.taxa.show.photo_chooser_modal_desc" ) }
                </p>
                <div className="stacked photos">
                  { _.map( chosen, ( photo, i ) => (
                    <ChosenPhoto
                      key={this.keyForPhoto( photo )}
                      chooserID={this.keyForPhoto( photo )}
                      src={photo.small_url}
                      index={i}
                      movePhoto={this.movePhoto}
                      newPhotoEnter={chooserID => this.newPhotoEnter( chooserID )}
                      dropNewPhoto={chooserID => this.choosePhoto( chooserID )}
                      removePhoto={chooserID => this.removePhoto( chooserID )}
                      candidate={photo.candidate}
                      infoURL={this.infoURL( photo )}
                      isDefault={i === 0}
                    />
                  ) ) }
                </div>
                <p className="text-muted">
                  <small>
                    { I18n.t( "views.taxa.show.photo_chooser_modal_explanation" ) }
                  </small>
                </p>
              </PhotoChooserDropArea>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              bsStyle="primary"
              onClick={( ) => this.submit( )}
              disabled={submitting}
            >
              { submitting ? I18n.t( "saving" ) : I18n.t( "save_photos" ) }
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    );
  }
}

PhotoChooserModal.propTypes = {
  initialQuery: PropTypes.string,
  photos: PropTypes.array,
  chosen: PropTypes.array,
  visible: PropTypes.bool,
  onSubmit: PropTypes.func,
  onClose: PropTypes.func
};

PhotoChooserModal.defaultProps = {
  chosen: []
};

export default PhotoChooserModal;
