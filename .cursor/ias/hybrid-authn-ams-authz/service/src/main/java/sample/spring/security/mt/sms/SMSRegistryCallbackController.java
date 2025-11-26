package sample.spring.security.mt.sms;

import com.sap.cloud.security.config.ServiceConstants;
import com.sap.cloud.security.json.DefaultJsonObject;
import com.sap.cloud.security.xsuaa.http.MediaType;
import org.json.JSONException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import sample.spring.security.mt.sms.dto.Subscription;

import java.io.IOException;
import java.util.Optional;

@RestController
@RequestMapping(path = SMSRegistryCallbackController.PATH)
public class SMSRegistryCallbackController {
  public static final String PATH = "/mt/sms/v1.0/callback/zones/*";
  private static final Logger LOGGER = LoggerFactory.getLogger(SMSRegistryCallbackController.class);

  @PutMapping("/{zone}")
  public void onSubscribe(
          @PathVariable String zone, @RequestBody Subscription subscriptionDto, HttpServletResponse res) {
    LOGGER.info("Callback service with method=PUT called for zone={}", zone);

    try {
        String url = generateUrlForSubscriber(subscriptionDto);
        LOGGER.info("Generated subscription url: {}", url);
        res.setContentType(MediaType.APPLICATION_JSON.value());
        res.getWriter().write(url);
        res.setStatus(HttpServletResponse.SC_OK);
    } catch (JSONException | IOException e) {
      LOGGER.error("Couldn't subscribe to the app", e);
      res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }
  }

  @GetMapping("/{zone}/dependencies")
  public void onGetDependencies(
      @PathVariable String zone, HttpServletRequest req, HttpServletResponse res) {
      DefaultJsonObject vcapServices =
              new DefaultJsonObject(
                      Optional.ofNullable(System.getenv(ServiceConstants.VCAP_SERVICES)).orElseGet(() -> "{}"));

      String xsappname =
              vcapServices
                      .getJsonObjects("xsuaa")
                      .get(0)
                      .getJsonObject("credentials")
                      .getAsString("xsappname");
      try {
          res.setContentType(MediaType.APPLICATION_JSON.value());
          res.getWriter().write("[{\"xsappname\":\"" + xsappname + "\"}]");
          res.setStatus(HttpServletResponse.SC_OK);
      } catch (JSONException | IOException e) {
          LOGGER.error("Couldn't subscribe to the app", e);
          res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      }
  }

  @DeleteMapping
  public void onUnsubscribe(HttpServletRequest req, HttpServletResponse res) {
    LOGGER.info(
        "Callback service with method=DELETE called for subscription: ownServiceInstance: {}, serviceInstance: {}, planName: {}",
        req.getParameter("ownServiceInstance"),
        req.getParameter("serviceInstances"),
        req.getParameter("planName"));
    res.setStatus(HttpServletResponse.SC_OK);
  }

  private String generateUrlForSubscriber(Subscription subscriptionDto) {
    LOGGER.info("Subscription request data {}", subscriptionDto);
    String appUri =
            System.getenv("SMS_CALLBACK_BASE_URI") != null
                    ? System.getenv("SMS_CALLBACK_BASE_URI")
                    : "undefined-env-SMS_CALLBACK_BASE_URI.org";

    return String.format("\"https://%s-%s\"", subscriptionDto.getSubscriber().getSubaccountSubdomain(), appUri);
  }
}
