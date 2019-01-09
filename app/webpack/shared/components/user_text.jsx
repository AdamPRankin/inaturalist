import React from "react";
import PropTypes from "prop-types";
import safeHtml from "safe-html";
import htmlTruncate from "html-truncate";
import linkifyHtml from "linkifyjs/html";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = (
  "div a abbr acronym b blockquote br cite code dl dt em h1 h2 h3 h4 h5 h6 hr i"
  + " img li ol p pre s small strike strong sub sup tt ul"
  // + "table tr td th"
  // + "audio source embed iframe object param"
).split( " " );

const ALLOWED_ATTRIBUTES_NAMES = (
  "href src width height alt cite title class name abbr value align target rel"
  // + "xml:lang style controls preload"
).split( " " );

const ALLOWED_ATTRIBUTES = {
  href: {
    allowedTags: ["a"],
    filter: ( value ) => {
      // Only let through http urls
      if ( /^https?:/i.exec( value ) ) {
        return value;
      }
      return false;
    }
  }
};
for ( let i = 0; i < ALLOWED_ATTRIBUTES_NAMES.length; i++ ) {
  ALLOWED_ATTRIBUTES[ALLOWED_ATTRIBUTES_NAMES[i]] = { allTags: true };
}

const CONFIG = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES
};

class UserText extends React.Component {
  constructor( ) {
    super( );
    this.state = {
      more: false
    };
  }

  toggle( ) {
    this.setState( { more: !this.state.more } );
  }

  // Imperfect solution until we can get an API endpoint to check for the existence of these users
  hyperlinkMentions( text ) {
    return text.replace( /(\B)@([A-z][\\\w\\\-_]*)/g, "$1<a href=\"/people/$2\">@$2</a>" );
  }

  render( ) {
    const {
      text,
      truncate,
      config,
      moreToggle,
      stripWhitespace
    } = this.props;
    const { more } = this.state;
    const { className } = Object.assign( { }, this.props );
    if ( !text || text.length === 0 ) {
      return <div className={`UserText ${className}`} />;
    }
    const withBreaks = text.trim( ).replace( /\n/gm, "<br />" );
    const html = safeHtml( this.hyperlinkMentions( withBreaks ), config || CONFIG );
    let truncatedHtml;
    if ( truncate && truncate > 0 && !more ) {
      truncatedHtml = htmlTruncate( html, truncate );
    }
    let moreLink;
    if ( truncate && ( truncatedHtml !== html ) && moreToggle ) {
      moreLink = (
        <a
          onClick={ ( ) => {
            this.toggle( );
            return false;
          } }
          className={truncate && truncate > 0 ? "more" : "collapse"}
        >
          { more ? I18n.t( "less" ) : I18n.t( "more" ) }
        </a>
      );
    }

    let htmlToDisplay = sanitizeHtml(
      linkifyHtml( truncatedHtml || html, { className: null, attributes: { rel: "nofollow" } } ),
      {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: { "*": ALLOWED_ATTRIBUTES_NAMES },
        exclusiveFilter: stripWhitespace && ( frame => ( frame.tag === "a" && !frame.text.trim( ) ) )
      }
    );
    if ( stripWhitespace ) {
      htmlToDisplay = htmlToDisplay.trim( ).replace( /^(<br *\/?>\s*)+/, "" );
    }
    return (
      <div className={`UserText ${className}`}>
        <span
          className="content"
          dangerouslySetInnerHTML={ { __html: htmlToDisplay } }
        /> { moreLink }
      </div>
    );
  }
}

UserText.propTypes = {
  text: PropTypes.string,
  truncate: PropTypes.number,
  config: PropTypes.object,
  className: PropTypes.string,
  moreToggle: PropTypes.bool,
  stripWhitespace: PropTypes.bool
};

UserText.defaultProps = {
  moreToggle: true
};

export default UserText;
