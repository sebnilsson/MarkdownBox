using System.Web.Mvc;

namespace MarkdownBox.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return this.View();
        }

    }
}