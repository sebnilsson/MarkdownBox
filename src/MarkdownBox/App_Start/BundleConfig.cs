using SquishIt.Framework;

namespace MarkdownBox
{
    public static class BundleConfig
    {
        public static void RegisterCachedBundles()
        {
            // SiteStyles
            Bundle.Css()
                .Add("~/Libraries/Normalize.css")
                .Add("~/Libraries/bootstrap/css/bootstrap.css")
                .Add("~/Libraries/pagedown/Markdown.css")
                //.Add("~/libraries/google-prettify/sons-of-obsidian.css")
                .Add("~/libraries/google-prettify/prettify.css")
                .Add("~/libraries/add2home/add2home.css")
                .Add("~/Content/Site.css")
                .AsCached("bundled-site", "~/assets/css/bundled-site.js");

            // HeadScripts
            Bundle.JavaScript()
                .Add("~/Libraries/Modernizr.2.6.2.custom.js")
                .AsCached("bundled-head", "~/assets/js/bundled-head.js");

            // SiteScripts
            Bundle.JavaScript()
                .Add("~/Libraries/pagedown/Markdown.Converter.js")
                .Add("~/Libraries/pagedown/Markdown.Sanitizer.js")
                .Add("~/Libraries/pagedown/Markdown.Editor.js")
                .Add("~/libraries/google-prettify/prettify.js")
                .Add("~/libraries/add2home/add2home.js")
                .Add("~/libraries/jquery.hotkeys.js")

                .Add("~/content/App.js")
                .Add("~/content/Modules/DropboxController.js")
                .Add("~/content/Controllers/AuthController.js")
                .Add("~/content/Controllers/IOController.js")
                .Add("~/content/Controllers/MessageController.js")
                .Add("~/content/Controllers/WmdController.js")
                .AsCached("bundled-site", "~/assets/js/bundled-site.js");
        }
    }
}