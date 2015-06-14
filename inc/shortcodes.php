<?php 

/*
 * * * * * * * * * * * * * * * * *
 *	In-text citation shortcode * *
 * * * * * * * * * * * * * * * * *
*/

function inline_citation ( $atts ) {
	$a = shortcode_atts( array(
				'num' => 1,
				'return' => FALSE,
		), $atts);
	
	$cite_num = number_format($a['num'], 0);
	
	if ($a['return'] == FALSE) {
		return '<a name="bounceback' . esc_attr($a['num']) . '" class="cite" href="#citation' . esc_attr($a['num']) . '">[' . $cite_num . ']</a>';
	} else {	
		return '<a name="citation' . esc_attr($a['num']) . '" class="cite-return" href="#bounceback' . esc_attr($a['num']) . '">▲</a>';
	}
}
add_shortcode( 'cite', 'inline_citation' );


// TODO:

/*
 * * * * * * * * * * * * * * *
 *	Custom TinyMCE Buttons * *
 * * * * * * * * * * * * * * *
*/

// Filter Functions with Hooks
function custom_mce_button() {
  // Check if user have permission
  if ( !current_user_can( 'edit_posts' ) && !current_user_can( 'edit_pages' ) ) {
    return;
  }
  // Check if WYSIWYG is enabled
  if ( 'true' == get_user_option( 'rich_editing' ) ) {
    add_filter( 'mce_external_plugins', 'custom_tinymce_plugin' );
    add_filter( 'mce_buttons', 'register_mce_button' );
  }
}
add_action('admin_head', 'custom_mce_button');

// Function for new button
function custom_tinymce_plugin( $plugin_array ) {
  $plugin_array['custom_mce_button'] = plugins_url('academic-bloggers-toolkit/inc/tinymce-buttons.js');
  return $plugin_array;
}

// Register new button in the editor
function register_mce_button( $buttons ) {
  array_push( $buttons, 'custom_mce_button' );
  return $buttons;
}