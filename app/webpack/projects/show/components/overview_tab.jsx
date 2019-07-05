import _ from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { Grid, Row, Col } from "react-bootstrap";
import RecentObservationsContainer from "../containers/recent_observations_container";
import TopObserversPanelContainer from "../containers/top_observers_panel_container";
import TopSpeciesObserversPanelContainer from "../containers/top_species_observers_panel_container";
import TopSpeciesPanelContainer from "../containers/top_species_panel_container";
import PhotoModalContainer from "../../../taxa/show/containers/photo_modal_container";
import News from "./news";
import Requirements from "./requirements";
import OverviewRecentObservations from "./overview_recent_observations";
import OverviewStats from "./overview_stats";
import OverviewMap from "./overview_map";
import FlagAnItemContainer from "../../../shared/containers/flag_an_item_container";

const OverviewTab = props => {
  const { config, project, updateCurrentUser } = props;
  const instances = project.recent_observations ? project.recent_observations.results : null;
  return (
    <div className="OverviewTab">
      <OverviewRecentObservations {...props} />
      <Grid className="leaders-grid">
        <Row>
          <Col xs={4} className="no-padding">
            <TopObserversPanelContainer />
          </Col>
          <Col xs={4} className="no-padding">
            <TopSpeciesObserversPanelContainer />
          </Col>
          <Col xs={4} className="no-padding">
            <TopSpeciesPanelContainer />
          </Col>
        </Row>
      </Grid>
      <Grid className="info-grid">
        <Row>
          <Col xs={4}>
            <Requirements {...props} includeArrowLink />
          </Col>
          <OverviewStats {...props} />
          <Col xs={4}>
            <News {...props} />
          </Col>
        </Row>
      </Grid>
      { ( !_.isEmpty( project.placeRules ) || !_.isEmpty( instances ) ) && (
        <div>
          <OverviewMap project={project} config={config} updateCurrentUser={updateCurrentUser} />
          <RecentObservationsContainer />
          <PhotoModalContainer />
        </div>
      ) }
      <Grid>
        <Row>
          <Col xs={12}>
            <FlagAnItemContainer
              item={project}
              manageFlagsPath={`/projects/${project.id}/flags`}
            />
          </Col>
        </Row>
      </Grid>
    </div>
  );
};

OverviewTab.propTypes = {
  project: PropTypes.object,
  config: PropTypes.object,
  setSelectedTab: PropTypes.func,
  updateCurrentUser: PropTypes.func
};

export default OverviewTab;
