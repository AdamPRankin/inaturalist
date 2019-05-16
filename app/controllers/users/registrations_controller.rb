class Users::RegistrationsController < Devise::RegistrationsController

  layout "registrations"

  before_filter :load_registration_form_data, only: [:new, :create]

  def whitelist_params
    if params[:user]
      params.require(:user).permit(
        :birthday,
        :description,
        :email,
        :icon,
        :icon_url,
        :locale,
        :login,
        :name,
        :password,
        :password_confirmation,
        :pi_consent,
        :place_id,
        :preferred_observation_fields_by,
        :preferred_observation_license,
        :preferred_photo_license,
        :preferred_sound_license,
        :prefers_community_taxa,
        :time_zone
      )
    end
  end

  def create
    build_resource(whitelist_params)
    resource.site = @site

    requestor_ip = Logstasher.ip_from_request_env(request.env)
    resource.last_ip = requestor_ip

    if @site.using_recaptcha? && !is_mobile_app? && !request.format.json?
      if !GoogleRecaptcha.verify_recaptcha( response: params["g-recaptcha-response"],
                                            remoteip: requestor_ip,
                                            secret: @site.google_recaptcha_secret )
        errors = [ I18n.t( :recaptcha_verification_failed ) ]
        resource.errors.add(:recaptcha, I18n.t( :recaptcha_verification_failed ) )
      end
    end

    # If for some reason a user is already signed in, don't allow them to make
    # another user
    if current_user
      errors ||= []
      errors << I18n.t( :user_already_authenticated )
    end

    unless errors
      if resource.save
        if resource.active_for_authentication?
          set_flash_message :notice, :signed_up if is_navigational_format?
          sign_in(resource_name, resource)
          respond_with(resource) do |format|
            format.html do
              if session[:return_to_for_new_user]
                redirect_to session[:return_to_for_new_user]
              else
                redirect_to home_path( new_user: true )
              end
            end
            format.json do
              render :json => resource.as_json(User.default_json_options)
            end
          end
          return
        else
          set_flash_message :notice, :"signed_up_but_#{resource.inactive_message}" if is_navigational_format?
          expire_session_data_after_sign_in!
          redirect_to root_url
          return
        end
      else
        errors = resource.errors.full_messages
      end
    end

    clean_up_passwords resource
    respond_with(resource) do |format|
      format.html { render :new }
      format.json { render json: { errors: errors } }
    end
  end

end
