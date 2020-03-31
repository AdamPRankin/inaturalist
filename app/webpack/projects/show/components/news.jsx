import _ from "lodash";
import React from "react";
import PropTypes from "prop-types";
import moment from "moment";
import UserText from "../../../shared/components/user_text";

const News = ( { project } ) => {
  if ( !project.posts_loaded ) {
    return ( <div className="loading_spinner huge" /> );
  }
  const noNews = _.isEmpty( project.posts ) || _.isEmpty( project.posts.results );
  return (
    <div className="News">
      <h2>
        { I18n.t( "journal" ) }
        <a href={ `/projects/${project.slug}/journal` }>
          <i className="fa fa-arrow-circle-right" />
        </a>
      </h2>
      { noNews ?
        (
          <div className="empty-text">
            No journal posts yet. { I18n.t( "check_back_soon" ) }
          </div>
        ) : (
          <div>
            <div className="posts">
              { _.map( project.posts.results, post => (
                <div className="post" key={ `post_${post.id}` }>
                  <a href={ `/projects/${project.slug}/journal/${post.id}` }>
                    <div className="date">{ moment( post.created_at ).format( "LL - LT" ) }</div>
                    <div className="title">{ post.title }</div>
                    <div className="body">
                      <UserText
                        text={ post.body }
                        truncate={ 120 }
                        moreToggle={ false }
                        stripWhitespace
                      />
                    </div>
                  </a>
                </div>
              ) ) }
            </div>
            <a href={ `/projects/${project.slug}/journal` }>
              <button className="btn-green" >
                { I18n.t( "view_all" ) }
              </button>
            </a>
          </div>
        )
      }
    </div>
  );
};

News.propTypes = {
  config: PropTypes.object,
  project: PropTypes.object,
  leaders: PropTypes.array,
  type: PropTypes.string
};

export default News;
