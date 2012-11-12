using System;
using System.Web.Mvc;
using SquishIt.Framework;

namespace MarkdownBox.Controllers
{
    public class AssetsController : Controller
    {
        public const int DefaultCacheDuration = 300;

        [OutputCache(Duration = DefaultCacheDuration, VaryByParam = "id;r")]
        public ActionResult Js(string id)
        {
            // Set max-age to a year from now
            Response.Cache.SetMaxAge(TimeSpan.FromDays(365));

            id = id ?? string.Empty;
            string name = id.Substring(0, id.LastIndexOf("."));
            return Content(Bundle.JavaScript().RenderCached(name), "text/javascript");
        }

        [OutputCache(Duration = DefaultCacheDuration, VaryByParam = "id;r")]
        public ActionResult Css(string id)
        {
            // Set max-age to a year from now
            Response.Cache.SetMaxAge(TimeSpan.FromDays(365));

            id = id ?? string.Empty;
            string name = id.Substring(0, id.LastIndexOf("."));
            return Content(Bundle.Css().RenderCached(name), "text/css");
        }
    }
}