/**
 * SPDX-FileCopyrightText: 2018-2022 SAP SE or an SAP affiliate company and Cloud Security Client Java contributors
 *
 * SPDX-License-Identifier: Apache-2.0
 */
package sample.spring.security.mt.saas;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class SaasRegistryCallbackController {

    @PutMapping ("/mt/saas/onboard/{tenantid}")
    public String onboard(@PathVariable String tenantid, @RequestBody Map data) {
        System.err.println(data);
        return "https://"+data.get("subscribedSubdomain")+"-"+System.getenv("SMS_CALLBACK_BASE_URI");
    }
    @DeleteMapping ("/mt/saas/onboard/{tenantid}")
    public void offboard(@PathVariable String tenantid) {

    }
    @GetMapping ("/mt/ping")
    public String ping() {
        return "ok";
    }
}
