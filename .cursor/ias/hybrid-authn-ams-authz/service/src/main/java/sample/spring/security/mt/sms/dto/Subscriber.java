package sample.spring.security.mt.sms.dto;


import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;


@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Subscriber {
   String zoneId;
   String zoneName;
   String tenantId;
   String subaccountSubdomain;
}