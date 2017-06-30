import _ from "lodash";
import React, { PropTypes } from "react";
import { Popover, OverlayTrigger } from "react-bootstrap";
import SplitTaxon from "../../../shared/components/split_taxon";
import CommunityIDPopover from "./community_id_popover";
import TaxonSummaryPopover from "./taxon_summary_popover";
import ConservationStatusBadge from "../components/conservation_status_badge";
import EstablishmentMeansBadge from "../components/establishment_means_badge";
import util from "../util";

class CommunityIdentification extends React.Component {

  constructor( ) {
    super( );
    this.ownerID = null;
    this.setInstanceVars = this.setInstanceVars.bind( this );
    this.communityIDOptIn = this.communityIDOptIn.bind( this );
    this.communityIDOptOut = this.communityIDOptOut.bind( this );
    this.showCommunityIDModal = this.showCommunityIDModal.bind( this );
    this.communityIDOverridePanel = this.communityIDOverridePanel.bind( this );
    this.communityIDOverrideStatement = this.communityIDOverrideStatement.bind( this );
    this.optOutPopoverClose = this.optOutPopoverClose.bind( this );
  }

  setInstanceVars( ) {
    const { observation, config } = this.props;
    this.loggedIn = config && config.currentUser;
    this.observerOptedOut = ( observation.user.preferences &&
      observation.user.preferences.prefers_community_taxa === false );
    this.observationOptedIn = ( observation.preferences &&
      observation.preferences.prefers_community_taxon === true );
    this.observationOptedOut = ( observation.preferences &&
      observation.preferences.prefers_community_taxon === false );
    this.userIsObserver = this.loggedIn && config.currentUser.id === observation.user.id;
    this.communityIDIsRejected = ( this.observationOptedOut ||
      ( this.observerOptedOut && !this.observationOptedIn ) );
  }

  communityIDOptIn( e ) {
    e.preventDefault( );
    this.props.updateObservation( { prefers_community_taxon: true } );
  }

  communityIDOptOut( e ) {
    e.preventDefault( );
    this.props.updateObservation( { prefers_community_taxon: false } );
    this.optOutPopoverClose( );
  }

  optOutPopoverClose( ) {
    this.refs["popover-trigger"].hide( );
  }

  communityIDInfoPopover( ) {
    return (
      <Popover
        className="CommunityIDInfoOverlay"
        id="popover-community-id-info"
      >
        <div dangerouslySetInnerHTML={ { __html:
          I18n.t( "views.observations.community_id.explanation" ) } }
        />
      </Popover>
    );
  }

  communityIDOverridePanel( ) {
    if ( !( this.userIsObserver && this.ownerID && this.communityIDIsRejected ) ) {
      return ( <div /> );
    }
    return (
      <div className="override out">
        <span className="bold">
          { I18n.t( "views.observations.community_id.you_have_opted_out" ) }.
        </span>
        <a href="#" onClick={ this.communityIDOptIn }>
          { I18n.t( "views.observations.community_id.opt_in_for_this_observation" ) }
        </a>
        <span className="separator">·</span>
        <a href="/users/edit">
          { I18n.t( "edit_your_default_settings" ) }
        </a>
      </div>
    );
  }

  communityIDOverrideStatement( ) {
    let statement;
    if ( this.communityIDIsRejected ) {
      statement = ( <span className="opted_out">
        ({ I18n.t( "user_has_opted_out_of_community_id" ) })
        <OverlayTrigger
          trigger="click"
          rootClose
          placement="top"
          overlay={ this.communityIDInfoPopover( ) }
          containerPadding={ 20 }
        >
          <i className="fa fa-info-circle" />
        </OverlayTrigger>
      </span> );
    }
    return statement;
  }

  optOutPopover( ) {
    // must be observer, IDer, must not have opted out already
    if ( !( this.userIsObserver && this.ownerID && !this.observationOptedOut ) ) {
      return ( <div /> );
    }
    // the taxa must be different, or the user defaults to opt-out, but opted in here
    if ( this.ownerID.taxon.id === this.props.observation.taxon.id &&
         !( this.observerOptedOut && this.observationOptedIn ) ) {
      return ( <div /> );
    }
    let dissimilarMessage;
    const idName = this.ownerID.taxon.preferred_common_name || this.ownerID.taxon.name;
    if ( this.ownerID.taxon.id !== this.props.observation.taxon.id ) {
      dissimilarMessage = ( <span className="something" dangerouslySetInnerHTML={ { __html:
        I18n.t( "views.observations.community_id.your_id_does_not_match", {
          taxon_name: idName } ) } }
      /> );
    }
    const popover = (
      <Popover
        className="OptOutPopover"
        id="popover-opt-out"
      >
        <p>
          { I18n.t( "if_for_some_reason_a_user_doesnt_agree" ) }
        </p>
        <p>
          { dissimilarMessage }
        </p>
        <div className="action">
          <button
            className="btn btn-default reject"
            onClick={ this.communityIDOptOut }
          >
            { I18n.t( "yes_reject_it" ) }
          </button>
          <div
            className="cancel linky"
            onClick={ this.optOutPopoverClose }
          >
            { I18n.t( "cancel" ) }
          </div>
        </div>
      </Popover>
    );
    return (
      <OverlayTrigger
        trigger="click"
        rootClose
        placement="top"
        containerPadding={ 20 }
        overlay={ popover }
        ref="popover-trigger"
      >
        <div className="reject linky">
          { I18n.t( "reject?" ) }
        </div>
      </OverlayTrigger>
    );
  }

  showCommunityIDModal( ) {
    this.props.setCommunityIDModalState( { show: true } );
  }

  render( ) {
    const { observation, config, addID } = this.props;
    const loggedIn = config && config.currentUser;
    const taxon = observation.taxon;
    if ( !observation || !observation.user ) {
      return ( <div /> );
    }
    this.setInstanceVars( );
    let compareLink;
    let canAgree = true;
    let userAgreedToThis;
    let stats;
    let photo;
    const taxonImageTag = util.taxonImage( taxon );
    const votesFor = [];
    const votesAgainst = [];
    if ( taxon ) {
      const tid = taxon.rank_level <= 10 ?
      taxon.ancestor_ids[taxon.ancestor_ids - 2] : taxon.id;
      compareLink = `/observations/identotron?observation_id=${observation.id}&taxon=${tid}`;
      const currentUserID = loggedIn && _.findLast( observation.identifications, i => (
        i.current && i.user && i.user.id === config.currentUser.id
      ) );
      this.ownerID = _.findLast( observation.identifications, i => (
        i.current && i.user && i.user.id === observation.user.id
      ) );
      if ( currentUserID ) {
        canAgree = util.taxaDissimilar( currentUserID.taxon, taxon );
        userAgreedToThis = currentUserID.agreedTo && currentUserID.agreedTo === "communityID";
      }
      const taxonAncestry = taxon.ancestry ? `${taxon.ancestry}/${taxon.id}` : `${taxon.id}`;
      _.each( observation.identifications, i => {
        if ( !i.current ) { return; }
        const idAncestry = `${i.taxon.ancestry}/${i.taxon.id}`;
        if ( taxonAncestry.includes( idAncestry ) || idAncestry.includes( taxonAncestry ) ) {
          votesFor.push( i );
        } else {
          votesAgainst.push( i );
        }
      } );
      const totalVotes = votesFor.length + votesAgainst.length;
      const voteCells = [];
      const width = `${_.round( 100 / totalVotes, 3 )}%`;
      _.each( votesFor, v => {
        voteCells.push( (
          <CommunityIDPopover
            key={ `community-id-${v.id}` }
            keyPrefix="ids"
            identification={ v }
            communityIDTaxon={ taxon }
            agreement
            contents={ ( <div className="for" style={ { width } } /> ) }
          />
        ) );
      } );
      _.each( votesAgainst, v => {
        voteCells.push( (
          <CommunityIDPopover
            key={ `community-id-${v.id}` }
            keyPrefix="ids"
            identification={ v }
            communityID={ taxon }
            agreement={ false }
            contents={ ( <div className="against" style={ { width } } /> ) }
          />
        ) );
      } );
      let linesAndNumbers;
      if ( voteCells.length > 1 ) {
        linesAndNumbers = (
          <span>
            <div className="lines">
              <div className="two-thirds">&nbsp;</div>
            </div>
            <div className="numbers">
              <div className="first">0</div>
              <div className="two-thirds">{ I18n.t( "two_thirds" ) }</div>
              <div className="last">{ voteCells.length }</div>
            </div>
          </span>
        );
      }
      stats = (
        <span>
          <span className="cumulative">
            { voteCells.length > 1 ?
              I18n.t( "cumulative_ids", { count: votesFor.length, total: voteCells.length } ) : "" }
          </span>
          <div className="graphic">
            { voteCells }
            { linesAndNumbers }
          </div>
        </span>
      );
      photo = (
        <TaxonSummaryPopover
          taxon={ taxon }
          contents={ taxonImageTag }
        />
      );
    } else {
      compareLink = `/observations/identotron?observation_id=${observation.id}&taxon=0`;
      canAgree = false;
      stats = (
        <span>
          <span className="cumulative">
            No IDs have been suggested yet
          </span>
        </span>
      );
      photo = taxonImageTag;
    }

    return (
      <div className="CommunityIdentification">
        <h4>
          { I18n.t( "community_id_heading" ) }
          { this.communityIDOverrideStatement( ) }
          { this.optOutPopover( ) }
        </h4>
        { this.communityIDOverridePanel( ) }
        <div className="info">
          <div className="photo">{ photo }</div>
          <div className="badges">
            <ConservationStatusBadge observation={ observation } />
            <EstablishmentMeansBadge observation={ observation } />
          </div>
          <SplitTaxon
            taxon={ taxon }
            url={ taxon ? `/taxa/${taxon.id}` : null }
            placeholder={ observation.species_guess }
          />
          { stats }
        </div>
        <div className="action">
          <div className="btn-space">
            <button className="btn btn-default" disabled={ !canAgree }
              onClick={ ( ) => { addID( taxon, { agreedTo: "communityID" } ); } }
            >
            { userAgreedToThis ? ( <div className="loading_spinner" /> ) :
              ( <i className="fa fa-check" /> ) } { I18n.t( "agree_" ) }
            </button>
          </div>
          <div className="btn-space">
            <a href={ compareLink }>
              <button className="btn btn-default">
                <i className="fa fa-exchange" /> { I18n.t( "compare" ) }
              </button>
            </a>
          </div>
          <div className="btn-space">
            <button className="btn btn-default" onClick={ this.showCommunityIDModal }>
              <i className="fa fa-info-circle" /> { I18n.t( "about" ) }
            </button>
          </div>
        </div>
      </div>
    );
  }
}

CommunityIdentification.propTypes = {
  config: PropTypes.object,
  observation: PropTypes.object,
  addID: PropTypes.func,
  setCommunityIDModalState: PropTypes.func,
  updateObservation: PropTypes.func
};

export default CommunityIdentification;
